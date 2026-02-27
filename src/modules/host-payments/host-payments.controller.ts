import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Headers,
  BadRequestException,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
  Logger,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HostPaymentsService } from './host-payments.service';
import { CreateConnectAccountDto } from './dto/create-connect-account.dto';

@ApiTags('Host Payments (Stripe Connect)')
@Controller('stripe')
export class HostPaymentsController {
  private readonly logger = new Logger(HostPaymentsController.name);

  constructor(private readonly hostPaymentsService: HostPaymentsService) {}

  @Post('connect/create-account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Crear cuenta Stripe Connect Express',
    description: `
      Crea una cuenta Express en Stripe Connect para el host,
      genera el link de onboarding y registra el StripeAccountId en BD.
      Retorna la URL para que el usuario complete el onboarding.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Link de onboarding generado',
    schema: {
      type: 'object',
      properties: {
        onboardingUrl: { type: 'string', description: 'URL de Stripe Connect onboarding' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o error de Stripe' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async createConnectAccount(@Body() dto: CreateConnectAccountDto, @Req() req: any) {
    const userId = dto?.userId ?? req.user?.userId;
    if (!userId) {
      throw new BadRequestException('UserId es requerido');
    }
    return this.hostPaymentsService.createConnectAccount(userId);
  }

  @Post('connect/account-update-link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Link para actualizar datos bancarios / cuenta Stripe',
    description: `
      Genera una URL de un solo uso para que el host actualice su información
      en Stripe (cuenta bancaria, datos fiscales, etc.). Solo aplica si ya
      completó el onboarding. Redirige al mismo flujo de Stripe (return/refresh
      según STRIPE_RETURN_URL / STRIPE_REFRESH_URL).
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'URL para abrir y actualizar datos',
    schema: {
      type: 'object',
      properties: {
        updateUrl: { type: 'string', description: 'URL de Stripe para actualizar la cuenta' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Usuario sin cuenta Connect' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getAccountUpdateLink(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('UserId es requerido');
    }
    return this.hostPaymentsService.getAccountUpdateLink(userId);
  }

  @Get('account-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Estado de la cuenta Stripe Connect del host',
    description: `
      Devuelve chargesEnabled, payoutsEnabled y onboardingCompleted.
      Opcionalmente refresca el estado desde Stripe (útil tras el deep link
      por si el webhook aún no ha llegado).
      El front debe llamar a completeHostOnboarding() solo cuando
      chargesEnabled === true && payoutsEnabled === true.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de la cuenta',
    schema: {
      type: 'object',
      properties: {
        hasAccount: { type: 'boolean' },
        chargesEnabled: { type: 'boolean' },
        payoutsEnabled: { type: 'boolean' },
        onboardingCompleted: { type: 'boolean' },
        accountStatus: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getAccountStatus(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('UserId es requerido');
    }
    return this.hostPaymentsService.getAccountStatus(userId, { refreshFromStripe: true });
  }

  @Post('process-payouts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Procesar payouts pendientes (admin)',
    description: `
      Busca payouts programados cuya fecha ya pasó y los procesa:
      1. Marca como 'processing' en BD
      2. Crea un Transfer en Stripe hacia la cuenta Connect del host
      3. Actualiza a 'completed' o 'failed' según resultado

      También se ejecuta automáticamente cada hora vía cron.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado del procesamiento',
    schema: {
      type: 'object',
      properties: {
        processed: { type: 'number', example: 3 },
        failed: { type: 'number', example: 0 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async processPayouts() {
    return this.hostPaymentsService.processPendingPayouts();
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Req() req: RawBodyRequest<Request> & Request,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    this.logger.log(
      `[WEBHOOK ENTRY] POST /stripe/webhook — rawBody: ${rawBody ? `SI (${rawBody.length} bytes)` : 'NO'}, signature: ${signature ? 'SI' : 'NO'}`,
    );
    if (!rawBody || !signature) {
      this.logger.warn('[WEBHOOK ENTRY] Rechazado: falta rawBody o signature');
      throw new BadRequestException('Cuerpo o firma del webhook ausentes');
    }
    return this.hostPaymentsService.processWebhook(rawBody, signature);
  }

  /**
   * Endpoint de redirección para cuando el usuario completa el onboarding de Stripe.
   * Redirige al deep link de la app móvil: poolandchill://stripe/return
   */
  @Get('return')
  @ApiExcludeEndpoint()
  async handleReturn(@Res() res: Response) {
    // Redirigir al deep link de la app móvil
    res.redirect('poolandchill://stripe/return');
  }

  /**
   * Endpoint de redirección para cuando el usuario necesita refrescar el onboarding de Stripe.
   * Redirige al deep link de la app móvil: poolandchill://stripe/refresh
   */
  @Get('refresh')
  @ApiExcludeEndpoint()
  async handleRefresh(@Res() res: Response) {
    // Redirigir al deep link de la app móvil
    res.redirect('poolandchill://stripe/refresh');
  }
}
