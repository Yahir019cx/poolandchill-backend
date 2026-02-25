import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthThrottlerGuard } from '../guards/throttler.guard';
import { AppleLoginDto } from './dto/apple-login.dto';
import { AppleAuthService } from './apple-auth.service';
import { AppleLoginResponse } from '../interfaces/login-response.interface';

/**
 * Controller para login con Apple (Sign in with Apple — Identity Token validation server-side).
 */
@ApiTags('Authentication - Apple')
@Controller('auth')
export class AppleAuthController {
  constructor(private readonly appleAuthService: AppleAuthService) {}

  @Post('apple')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Iniciar sesión con Apple (Sign in with Apple)',
    description: `
Autentica con el Identity Token de Apple. El backend valida el token usando las JWKS de Apple (issuer, audience, exp, firma RS256).
No se aceptan email ni sub enviados por el cliente; todo se extrae del token verificado.

**firstName / lastName:** Apple solo los envía en el primer login desde el dispositivo (ASAuthorizationAppleIDCredential.fullName). En logins posteriores vendrán vacíos.

**Flujo:**
1. Validar identityToken contra JWKS de Apple
2. Llamar a security.xsp_login_with_provider (ProviderType=2) con sub, email, displayName
3. Generar JWT y Refresh Token del sistema
4. Retornar datos del usuario, tokens e isNewUser
    `,
  })
  @ApiTooManyRequestsResponse({
    description: 'Demasiados intentos. Espera 1 minuto.',
  })
  @ApiBody({
    type: AppleLoginDto,
    examples: {
      apple: {
        summary: 'Login con Apple (primer login)',
        value: {
          identityToken: 'eyJraWQiOiJBSURPUEsxIiwiYWxnIjoiUlMyNTYifQ...',
          firstName: 'Juan',
          lastName: 'Pérez',
        },
      },
      appleReturning: {
        summary: 'Login con Apple (login posterior — sin nombre)',
        value: {
          identityToken: 'eyJraWQiOiJBSURPUEsxIiwiYWxnIjoiUlMyNTYifQ...',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'JWT del sistema (15 min)' },
        refreshToken: { type: 'string', description: 'Refresh Token UUID (90 días)' },
        expiresIn: { type: 'number', example: 900 },
        isNewUser: { type: 'boolean', description: 'true si se registró en este login' },
        user: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            displayName: { type: 'string', nullable: true },
            profileImageUrl: { type: 'string', nullable: true },
            roles: { type: 'array', items: { type: 'string' } },
            isEmailVerified: { type: 'boolean' },
            isHost: { type: 'boolean' },
            isStaff: { type: 'boolean' },
            accountStatus: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            lastLoginAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos (ej. identityToken vacío)' })
  @ApiResponse({
    status: 401,
    description: 'Token de Apple inválido o expirado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Token de Apple inválido o expirado' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Cuenta suspendida, eliminada o baneada' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async loginWithApple(@Body() dto: AppleLoginDto): Promise<AppleLoginResponse> {
    return this.appleAuthService.loginWithApple(dto);
  }
}
