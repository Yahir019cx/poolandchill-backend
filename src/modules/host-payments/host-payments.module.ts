import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HostPaymentsController } from './host-payments.controller';
import { HostPaymentsService } from './host-payments.service';

/**
 * Módulo Host Payments (Stripe Connect Express).
 *
 * Endpoints:
 * - POST /stripe/connect/create-account - Crear cuenta Express y obtener URL de onboarding
 * - POST /stripe/webhook - Webhook de Stripe (account.updated → actualiza estado en BD)
 *
 * Requiere en .env: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
 * SP en BD: [payment].[xsp_RegisterStripeAccount]
 */
@Module({
  imports: [ConfigModule],
  controllers: [HostPaymentsController],
  providers: [HostPaymentsService],
  exports: [HostPaymentsService],
})
export class HostPaymentsModule {}
