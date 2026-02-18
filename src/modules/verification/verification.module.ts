import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { DiditWebhookGuard } from './guards/didit-webhook.guard';
import { EmailModule } from '../../web/email/email.module';
import { AdminModule } from '../admin/admin.module';

/**
 * Módulo de verificación de identidad
 *
 * Integra con Didit para verificación KYC/KYB
 *
 * Endpoints:
 * - POST /verification/start - Iniciar verificación (retorna URL de Didit)
 * - GET /verification/status - Consultar estado de verificación
 * - POST /verification/send-verification-email - Enviar correo al anfitrión (admin)
 * - POST /verification/webhook/didit - Webhook de Didit (interno)
 */
@Module({
  imports: [ConfigModule, EmailModule, AdminModule],
  controllers: [VerificationController],
  providers: [VerificationService, DiditWebhookGuard],
  exports: [VerificationService],
})
export class VerificationModule {}
