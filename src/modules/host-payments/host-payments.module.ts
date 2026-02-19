import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HostPaymentsController } from './host-payments.controller';
import { HostPaymentsService } from './host-payments.service';

/**
 * Módulo Host Payments (Stripe Connect Express).
 *
 * Endpoints:
 * - POST /stripe/connect/create-account - Crear cuenta Express y obtener URL de onboarding
 * - GET /stripe/account-status - Estado de la cuenta (chargesEnabled, payoutsEnabled); refresca desde Stripe
 * - POST /stripe/webhook - Webhook de Stripe (account.updated → actualiza estado en BD)
 *
 * Requiere en .env: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET.
 * Opcional: STRIPE_RETURN_URL, STRIPE_REFRESH_URL (por defecto deep links poolandchill://stripe/return y poolandchill://stripe/refresh para app móvil).
 * SP en BD: [payment].[xsp_RegisterStripeAccount]
 */
@Module({
  imports: [ConfigModule],
  controllers: [HostPaymentsController],
  providers: [HostPaymentsService],
  exports: [HostPaymentsService],
})
export class HostPaymentsModule {}
