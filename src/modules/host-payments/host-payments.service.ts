import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import * as sql from 'mssql';
import { DatabaseService } from '../../config/database.config';

const SP_REGISTER_STRIPE_ACCOUNT = '[payment].[xsp_RegisterStripeAccount]';
const SP_GET_STRIPE_ACCOUNT_BY_USER_ID = '[payment].[xsp_GetStripeAccountByUserId]';

@Injectable()
export class HostPaymentsService {
  private readonly logger = new Logger(HostPaymentsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  getStripe(): Stripe {
    if (!this.stripe) {
      const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
      if (!secretKey) {
        throw new InternalServerErrorException('STRIPE_SECRET_KEY no configurada');
      }
      this.stripe = new Stripe(secretKey, { apiVersion: '2026-01-28.clover' });
    }
    return this.stripe;
  }

  /**
   * Verifica la firma del webhook y procesa el evento.
   * Lanza BadRequestException si la firma es inválida.
   */
  async processWebhook(rawBody: Buffer | string, signature: string): Promise<{ received: boolean }> {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new InternalServerErrorException('STRIPE_WEBHOOK_SECRET no configurada');
    }

    let event: Stripe.Event;
    try {
      event = this.getStripe().webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      ) as Stripe.Event;
    } catch (err: any) {
      throw new BadRequestException(`Firma de webhook inválida: ${err?.message}`);
    }

    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account;
      await this.handleAccountUpdated(account);
    }

    return { received: true };
  }

  /**
   * Crea una cuenta Express en Stripe Connect, genera el link de onboarding
   * y registra/actualiza el StripeAccountId en BD mediante el SP.
   */
  async createConnectAccount(userId: string): Promise<{ onboardingUrl: string }> {
    const stripe = this.getStripe();
    // Deep links para app móvil (Flutter). Override con STRIPE_RETURN_URL / STRIPE_REFRESH_URL si usas web.
    const returnUrl = this.configService.get<string>('STRIPE_RETURN_URL', 'poolandchill://stripe/return');
    const refreshUrl = this.configService.get<string>('STRIPE_REFRESH_URL', 'poolandchill://stripe/refresh');

    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'MX',
        metadata: { userId },
      });

      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        type: 'account_onboarding',
        refresh_url: refreshUrl,
        return_url: returnUrl,
      });

      await this.registerStripeAccountInDb({
        userId,
        stripeAccountId: account.id,
        email: account.email ?? null,
        country: account.country ?? null,
        defaultCurrency: account.default_currency ?? 'MXN',
        accountStatus: 'pending',
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        onboardingCompleted: false,
        onboardingUrl: null,
      });

      this.logger.log(`Cuenta Connect creada para usuario ${userId}: ${account.id}`);

      return { onboardingUrl: accountLink.url };
    } catch (err: any) {
      this.logger.error(`Error al crear cuenta Connect: ${err?.message}`);
      if (err?.type === 'StripeInvalidRequestError') {
        throw new BadRequestException(err.message ?? 'Error de Stripe');
      }
      throw new InternalServerErrorException('Error al crear cuenta de pagos');
    }
  }

  /**
   * Procesa el webhook account.updated: obtiene UserId por StripeAccountId y actualiza en BD.
   */
  async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    const stripeAccountId = account.id;
    const chargesEnabled = account.charges_enabled ?? false;
    const payoutsEnabled = account.payouts_enabled ?? false;
    const detailsSubmitted = account.details_submitted ?? false;
    const onboardingCompleted = chargesEnabled && payoutsEnabled;
    const accountStatus = chargesEnabled && payoutsEnabled ? 'active' : 'pending';

    const userId = await this.getUserIdByStripeAccountId(stripeAccountId);
    if (!userId) {
      this.logger.warn(`Webhook account.updated: no se encontró UserId para StripeAccountId=${stripeAccountId}`);
      return;
    }

    await this.registerStripeAccountInDb({
      userId,
      stripeAccountId,
      email: account.email ?? null,
      country: account.country ?? null,
      defaultCurrency: account.default_currency ?? null,
      accountStatus,
      chargesEnabled,
      payoutsEnabled,
      detailsSubmitted,
      onboardingCompleted,
      onboardingUrl: null,
    });

    this.logger.log(
      `Webhook account.updated: ${stripeAccountId} -> status=${accountStatus}, onboarding=${onboardingCompleted}`,
    );
  }

  private async getUserIdByStripeAccountId(stripeAccountId: string): Promise<string | null> {
    const rows = await this.databaseService.executeQuery<{ UserId: string }>(
      'SELECT UserId FROM [payment].[StripeConnectAccounts] WHERE StripeAccountId = @StripeAccountId',
      [{ name: 'StripeAccountId', type: sql.VarChar(100), value: stripeAccountId }],
    );
    return rows[0]?.UserId ?? null;
  }

  private async getStripeAccountByUserId(userId: string): Promise<{
    StripeAccountId: string;
    ChargesEnabled: boolean;
    PayoutsEnabled: boolean;
    AccountStatus: string;
    OnboardingCompleted: boolean;
  } | null> {
    const result = await this.databaseService.executeStoredProcedure<{
      StripeAccountId: string;
      ChargesEnabled: boolean;
      PayoutsEnabled: boolean;
      AccountStatus: string;
      OnboardingCompleted: boolean;
    }>(
      SP_GET_STRIPE_ACCOUNT_BY_USER_ID,
      [{ name: 'UserId', type: sql.UniqueIdentifier, value: userId }],
      [],
    );
    return result.recordset?.[0] ?? null;
  }

  /**
   * Devuelve el estado de la cuenta Stripe del host para el userId.
   * Opcionalmente refresca desde la API de Stripe y actualiza BD (útil cuando
   * el usuario vuelve por deep link y el webhook aún no ha llegado).
   * El front debe llamar a completeHostOnboarding() solo si
   * chargesEnabled === true && payoutsEnabled === true.
   */
  async getAccountStatus(
    userId: string,
    options: { refreshFromStripe?: boolean } = {},
  ): Promise<{
    hasAccount: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    onboardingCompleted: boolean;
    accountStatus: string;
  }> {
    const { refreshFromStripe = true } = options;
    const row = await this.getStripeAccountByUserId(userId);
    if (!row) {
      return {
        hasAccount: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        onboardingCompleted: false,
        accountStatus: 'none',
      };
    }

    if (refreshFromStripe) {
      try {
        const account = await this.getStripe().accounts.retrieve(row.StripeAccountId);
        await this.handleAccountUpdated(account);
        const updated = await this.getStripeAccountByUserId(userId);
        if (updated) {
          return {
            hasAccount: true,
            chargesEnabled: updated.ChargesEnabled,
            payoutsEnabled: updated.PayoutsEnabled,
            onboardingCompleted: updated.OnboardingCompleted,
            accountStatus: updated.AccountStatus,
          };
        }
      } catch (err: any) {
        this.logger.warn(`No se pudo refrescar cuenta Stripe para ${userId}: ${err?.message}`);
        // Fallback: devolver lo que tenemos en BD
      }
    }

    return {
      hasAccount: true,
      chargesEnabled: row.ChargesEnabled,
      payoutsEnabled: row.PayoutsEnabled,
      onboardingCompleted: row.OnboardingCompleted,
      accountStatus: row.AccountStatus,
    };
  }

  /**
   * Registra o actualiza el registro en BD usando el SP [payment].[xsp_RegisterStripeAccount].
   * El SP no tiene OUTPUT; devuelve Success/Message vía SELECT.
   */
  private async registerStripeAccountInDb(params: {
    userId: string;
    stripeAccountId: string;
    email: string | null;
    country: string | null;
    defaultCurrency: string | null;
    accountStatus: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    onboardingCompleted: boolean;
    onboardingUrl?: string | null;
  }): Promise<void> {
    const inputs: { name: string; type: sql.ISqlType | sql.ISqlTypeFactoryWithNoParams; value: any }[] = [
      { name: 'UserId', type: sql.UniqueIdentifier, value: params.userId },
      { name: 'StripeAccountId', type: sql.VarChar(100), value: params.stripeAccountId },
      { name: 'StripeCustomerId', type: sql.VarChar(100), value: null },
      { name: 'AccountStatus', type: sql.VarChar(50), value: params.accountStatus },
      { name: 'ChargesEnabled', type: sql.Bit, value: params.chargesEnabled },
      { name: 'PayoutsEnabled', type: sql.Bit, value: params.payoutsEnabled },
      { name: 'OnboardingCompleted', type: sql.Bit, value: params.onboardingCompleted },
      { name: 'OnboardingUrl', type: sql.VarChar(500), value: params.onboardingUrl ?? null },
      { name: 'DetailsSubmitted', type: sql.Bit, value: params.detailsSubmitted },
      { name: 'DefaultCurrency', type: sql.VarChar(10), value: params.defaultCurrency ?? 'MXN' },
      { name: 'Country', type: sql.VarChar(10), value: params.country ?? 'MX' },
      { name: 'Email', type: sql.VarChar(200), value: params.email ?? null },
    ];

    const result = await this.databaseService.executeStoredProcedure<{ Success: number; Message: string }>(
      SP_REGISTER_STRIPE_ACCOUNT,
      inputs,
      [], // SP no tiene parámetros OUTPUT
    );

    const row = result.recordset?.[0];
    if (row && row.Success !== 1) {
      this.logger.warn(`SP ${SP_REGISTER_STRIPE_ACCOUNT}: ${row.Message}`);
      throw new InternalServerErrorException(row.Message ?? 'Error al registrar cuenta Stripe');
    }
  }
}
