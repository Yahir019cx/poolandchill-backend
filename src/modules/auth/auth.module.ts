import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// Register
import { RegisterController } from './register/register.controller';
import { RegisterService } from './register/register.service';

// Email Verification
import { EmailVerificationController } from './email-verification/email-verification.controller';
import { EmailVerificationService } from './email-verification/email-verification.service';

// Login
import { LoginController } from './login/login.controller';
import { LoginService } from './login/login.service';

// Refresh Token
import { RefreshController } from './refresh/refresh.controller';
import { RefreshService } from './refresh/refresh.service';

// Logout
import { LogoutController } from './logout/logout.controller';
import { LogoutService } from './logout/logout.service';

// Forgot Password
import { ForgotPasswordController } from './forgot-password/forgot-password.controller';
import { ForgotPasswordService } from './forgot-password/forgot-password.service';

// Google Auth (ID Token validation server-side)
import { GoogleAuthController } from './google-auth/google-auth.controller';
import { GoogleAuthService } from './google-auth/google-auth.service';

// JWT Strategy & Guard
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// Shared Services
import { ZohoMailService } from '../../web/email/zoho-mail.service';

/**
 * Módulo de autenticación
 *
 * Incluye:
 * - Registro de usuarios con verificación de email
 * - Verificación de tokens de email
 * - Login con JWT y Refresh Tokens
 * - Refresh de Access Tokens
 * - Logout (revocación de tokens)
 *
 * Endpoints:
 * - POST /auth/register - Iniciar registro (envía email de verificación)
 * - GET /auth/verify-email?token={token} - Verificar email (redirige al frontend)
 * - POST /auth/login - Iniciar sesión (retorna Access Token y Refresh Token)
 * - POST /auth/refresh - Refrescar Access Token
 * - POST /auth/logout - Cerrar sesión (revocar Refresh Tokens)
 * - POST /auth/forgot-password - Solicitar recuperación de contraseña
 * - POST /auth/reset-password - Restablecer contraseña con token
 * - POST /auth/google - Login con Google (idToken validado server-side)
 */
@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<number>('JWT_EXPIRATION_SECONDS', 900), // 15 minutos
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    RegisterController,
    EmailVerificationController,
    LoginController,
    RefreshController,
    LogoutController,
    ForgotPasswordController,
    GoogleAuthController,
  ],
  providers: [
    RegisterService,
    EmailVerificationService,
    LoginService,
    RefreshService,
    LogoutService,
    ForgotPasswordService,
    GoogleAuthService,
    JwtStrategy,
    JwtAuthGuard,
    ZohoMailService,
  ],
  exports: [
    RegisterService,
    EmailVerificationService,
    LoginService,
    RefreshService,
    LogoutService,
    ForgotPasswordService,
    GoogleAuthService,
    JwtAuthGuard,
    JwtStrategy,
  ],
})
export class AuthModule {}
