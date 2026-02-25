import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import Stripe from 'stripe';
import * as sql from 'mssql';
import { DatabaseService } from '../../config/database.config';
import { BookingService } from '../booking/booking.service';

const SP_REGISTER_STRIPE_ACCOUNT = '[payment].[xsp_RegisterStripeAccount]';
const SP_GET_STRIPE_ACCOUNT_BY_USER_ID = '[payment].[xsp_GetStripeAccountByUserId]';
const SP_PROCESS_PAYOUT = '[payment].[xsp_ProcessPayout]';
const SP_UPDATE_PAYOUT_STATUS = '[payment].[xsp_UpdatePayoutStatus]';
const SP_GET_SCHEDULED_PAYOUTS = '[payment].[xsp_GetScheduledPayouts]';

@Injectable()
export class HostPaymentsService {
  private readonly logger = new Logger(HostPaymentsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly bookingService: BookingService,
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
    this.logger.log(`[WEBHOOK] Recibido — signature presente: ${!!signature}, rawBody length: ${rawBody?.length ?? 0}`);

    const connectSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    const paymentSecret = this.configService.get<string>('STRIPE_PAYMENT_WEBHOOK_SECRET');

    this.logger.log(`[WEBHOOK] Secrets disponibles — STRIPE_WEBHOOK_SECRET: ${connectSecret ? 'SI (' + connectSecret.slice(0, 10) + '...)' : 'NO'}, STRIPE_PAYMENT_WEBHOOK_SECRET: ${paymentSecret ? 'SI (' + paymentSecret.slice(0, 10) + '...)' : 'NO'}`);

    const secrets = [connectSecret, paymentSecret].filter(Boolean) as string[];

    if (secrets.length === 0) {
      this.logger.error('[WEBHOOK] Ningún webhook secret configurado');
      throw new InternalServerErrorException('Ningún webhook secret de Stripe configurado');
    }

    let event: Stripe.Event | null = null;
    let verifiedWithSecret = '';
    for (const secret of secrets) {
      try {
        event = this.getStripe().webhooks.constructEvent(
          rawBody,
          signature,
          secret,
        ) as Stripe.Event;
        verifiedWithSecret = secret.slice(0, 10) + '...';
        break;
      } catch (err: any) {
        this.logger.warn(`[WEBHOOK] Fallo verificación con secret ${secret.slice(0, 10)}...: ${err.message}`);
      }
    }

    if (!event) {
      this.logger.error('[WEBHOOK] Firma inválida con TODOS los secrets');
      throw new BadRequestException('Firma de webhook inválida');
    }

    const eventType = event.type as string;
    this.logger.log(`[WEBHOOK] Evento verificado OK (secret: ${verifiedWithSecret}) — tipo: ${eventType}, id: ${event.id}`);

    if (eventType === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const bookingIdRaw = pi.metadata?.bookingId;
      const bookingId = typeof bookingIdRaw === 'string' ? bookingIdRaw.trim() : undefined;

      this.logger.log(`[WEBHOOK] payment_intent.succeeded — PI: ${pi.id}, amount: ${pi.amount}, metadata: ${JSON.stringify(pi.metadata)}`);

      if (bookingId) {
        this.logger.log(`[WEBHOOK] Llamando confirmPaymentFromStripe para booking ${bookingId}...`);
        try {
          await this.bookingService.confirmPaymentFromStripe(bookingId, {
            paymentIntentId: pi.id,
            chargeId: typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id ?? null,
            amount: pi.amount / 100,
            currency: pi.currency?.toUpperCase() ?? 'MXN',
            paymentStatus: pi.status,
            paymentMethod: typeof pi.payment_method === 'string' ? pi.payment_method : pi.payment_method?.id ?? null,
            clientSecret: pi.client_secret ?? null,
          });
          this.logger.log(`[WEBHOOK] confirmPaymentFromStripe completado OK para booking ${bookingId}`);
        } catch (err: any) {
          this.logger.error(`[WEBHOOK] ERROR en confirmPaymentFromStripe para booking ${bookingId}: ${err.message}`, err.stack);
        }
      } else {
        this.logger.warn(`[WEBHOOK] payment_intent.succeeded SIN bookingId en metadata — PI: ${pi.id}, metadata: ${JSON.stringify(pi.metadata)}`);
      }
    } else if (eventType === 'account.created' || eventType === 'account.updated') {
      const account = event.data.object as Stripe.Account;
      this.logger.log(`[WEBHOOK] ${eventType} — account: ${account.id}`);
      await this.handleAccountUpdated(account);
    } else if (eventType.startsWith('transfer.')) {
      const transfer = event.data.object as Stripe.Transfer;
      this.logger.log(`[WEBHOOK] ${eventType} — transfer: ${transfer.id}, amount: ${transfer.amount}`);
      await this.handleTransferEvent(eventType, transfer);
    } else {
      this.logger.log(`[WEBHOOK] Evento no manejado: ${eventType}`);
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

    // Intentar obtener userId desde metadata primero (si está disponible)
    let userId: string | null | undefined = account.metadata?.userId;

    // Si no está en metadata, buscar en BD
    if (!userId) {
      userId = await this.getUserIdByStripeAccountId(stripeAccountId);
    }

    if (!userId) {
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
  }

  /**
   * Procesa eventos de transfer (transfer.paid, transfer.failed, transfer.reversed).
   */
  private async handleTransferEvent(eventType: string, transfer: Stripe.Transfer): Promise<void> {
    let newStatus: string;

    if (eventType === 'transfer.paid') {
      newStatus = 'completed';
    } else if (eventType === 'transfer.failed') {
      newStatus = 'failed';
    } else if (eventType === 'transfer.reversed') {
      newStatus = 'cancelled';
    } else {
      this.logger.log(`[WEBHOOK] Evento transfer no manejado: ${eventType}`);
      return;
    }

    try {
      const result = await this.databaseService.executeStoredProcedure<any>(
        SP_UPDATE_PAYOUT_STATUS,
        [
          { name: 'StripeTransferId', type: sql.VarChar(100), value: transfer.id },
          { name: 'NewStatus', type: sql.VarChar(50), value: newStatus },
          { name: 'FailureCode', type: sql.VarChar(100), value: (transfer as any).failure_code ?? null },
          { name: 'FailureMessage', type: sql.VarChar(500), value: (transfer as any).failure_message ?? null },
        ],
        [],
      );

      const row = result.recordset?.[0];
      this.logger.log(`[WEBHOOK] UpdatePayoutStatus resultado: ${JSON.stringify(row)}`);
    } catch (err: any) {
      this.logger.error(`[WEBHOOK] Error en UpdatePayoutStatus para transfer ${transfer.id}: ${err.message}`);
    }
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
      } catch {
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
      throw new InternalServerErrorException(row.Message ?? 'Error al registrar cuenta Stripe');
    }
  }

  // ─────────────────────────────────────────────
  // CRON: PROCESAR PAYOUTS PROGRAMADOS
  // ─────────────────────────────────────────────

  @Cron(CronExpression.EVERY_HOUR)
  async handlePayoutsCron() {
    this.logger.log('[PAYOUT CRON] Buscando payouts pendientes...');
    try {
      await this.processPendingPayouts();
    } catch (err: any) {
      this.logger.error(`[PAYOUT CRON] Error: ${err.message}`);
    }
  }

  async processPendingPayouts(): Promise<{ processed: number; failed: number }> {
    const result = await this.databaseService.executeStoredProcedure<{
      ID_Payout: string;
    }>(SP_GET_SCHEDULED_PAYOUTS, [], []);

    const pendingPayouts = result.recordset ?? [];

    if (pendingPayouts.length === 0) {
      this.logger.log('[PAYOUT CRON] No hay payouts programados');
      return { processed: 0, failed: 0 };
    }

    this.logger.log(`[PAYOUT CRON] ${pendingPayouts.length} payouts programados, intentando procesar...`);

    let processed = 0;
    let failed = 0;

    for (const payout of pendingPayouts) {
      try {
        await this.processOnePayout(payout.ID_Payout);
        processed++;
      } catch (err: any) {
        this.logger.error(`[PAYOUT] Error procesando ${payout.ID_Payout}: ${err.message}`);
        failed++;
      }
    }

    this.logger.log(`[PAYOUT CRON] Resultado: ${processed} procesados, ${failed} fallidos`);
    return { processed, failed };
  }

  private async processOnePayout(payoutId: string): Promise<void> {
    // Fase 1: Marcar como processing y obtener datos de Stripe
    const phase1 = await this.databaseService.executeStoredProcedure<any>(
      SP_PROCESS_PAYOUT,
      [
        { name: 'ID_Payout', type: sql.UniqueIdentifier, value: payoutId },
        { name: 'StripeTransferId', type: sql.VarChar(100), value: null },
        { name: 'StripeChargeId', type: sql.VarChar(100), value: null },
        { name: 'NewStatus', type: sql.VarChar(50), value: 'processing' },
      ],
      [],
    );

    const row = phase1.recordset?.[0];
    if (!row || row.Success !== 1) {
      this.logger.warn(`[PAYOUT] SP rechazó payout ${payoutId}: ${row?.Message}`);
      return;
    }

    const stripeAccountId: string = row.StripeAccountId;
    const amount: number = Number(row.Amount);
    const currency: string = (row.Currency ?? 'MXN').toLowerCase();

    this.logger.log(`[PAYOUT] Creando Transfer: $${amount} ${currency} → ${stripeAccountId}`);

    // Fase 2: Crear Transfer en Stripe
    try {
      const stripe = this.getStripe();
      const transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency,
        destination: stripeAccountId,
        description: `Payout ${payoutId}`,
      });

      this.logger.log(`[PAYOUT] Transfer creado: ${transfer.id}`);

      // Fase 3: Marcar como completed
      await this.databaseService.executeStoredProcedure<any>(
        SP_PROCESS_PAYOUT,
        [
          { name: 'ID_Payout', type: sql.UniqueIdentifier, value: payoutId },
          { name: 'StripeTransferId', type: sql.VarChar(100), value: transfer.id },
          { name: 'StripeChargeId', type: sql.VarChar(100), value: transfer.destination_payment as string ?? null },
          { name: 'NewStatus', type: sql.VarChar(50), value: 'completed' },
        ],
        [],
      );

      this.logger.log(`[PAYOUT] Payout ${payoutId} completado OK`);
    } catch (stripeErr: any) {
      this.logger.error(`[PAYOUT] Stripe Transfer falló para ${payoutId}: ${stripeErr.message}`);

      // Marcar como failed (el SP programa reintento o pone hold)
      await this.databaseService.executeStoredProcedure<any>(
        SP_PROCESS_PAYOUT,
        [
          { name: 'ID_Payout', type: sql.UniqueIdentifier, value: payoutId },
          { name: 'StripeTransferId', type: sql.VarChar(100), value: null },
          { name: 'StripeChargeId', type: sql.VarChar(100), value: null },
          { name: 'NewStatus', type: sql.VarChar(50), value: 'failed' },
        ],
        [],
      );
    }
  }
}
