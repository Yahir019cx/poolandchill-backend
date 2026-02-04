import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { DiditWebhookGuard } from './guards/didit-webhook.guard';

/**
 * Módulo de verificación de identidad
 *
 * Integra con Didit para verificación KYC/KYB
 *
 * Endpoints:
 * - POST /verification/start - Iniciar verificación (retorna URL de Didit)
 * - GET /verification/status - Consultar estado de verificación
 * - POST /verification/webhook/didit - Webhook de Didit (interno)
 */
@Module({
  imports: [ConfigModule],
  controllers: [VerificationController],
  providers: [VerificationService, DiditWebhookGuard],
  exports: [VerificationService],
})
export class VerificationModule {}
