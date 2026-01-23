import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Register
import { RegisterController } from './register/register.controller';
import { RegisterService } from './register/register.service';

// Email Verification
import { EmailVerificationController } from './email-verification/email-verification.controller';
import { EmailVerificationService } from './email-verification/email-verification.service';

// Shared Services
import { GraphMailService } from '../../web/email/graph-mail.service';

/**
 * Módulo de autenticación
 *
 * Incluye:
 * - Registro de usuarios con verificación de email
 * - Verificación de tokens de email
 *
 * Endpoints:
 * - POST /auth/register - Iniciar registro (envía email de verificación)
 * - GET /auth/verify-email?token={token} - Verificar email (redirige al frontend)
 */
@Module({
  imports: [ConfigModule],
  controllers: [RegisterController, EmailVerificationController],
  providers: [
    RegisterService,
    EmailVerificationService,
    GraphMailService,
  ],
  exports: [RegisterService, EmailVerificationService],
})
export class AuthModule {}
