import { Controller, Get, Post, Query, Body, Res, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { EmailVerificationService } from './email-verification.service';
import { ExchangeSessionDto } from './dto/exchange-session.dto';
import { encryptPayload } from '../../../common/utils/encryption.util';

/**
 * Controller para la verificación de email
 * Maneja el endpoint GET /auth/verify-email
 * IMPORTANTE: Este endpoint REDIRIGE al frontend, no retorna JSON
 */
@ApiTags('Authentication - Register')
@Controller('auth')
export class EmailVerificationController {
  private readonly logger = new Logger(EmailVerificationController.name);

  constructor(
    private readonly emailVerificationService: EmailVerificationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Verifica el token de email y redirige al frontend con session token
   *
   * Este endpoint es llamado cuando el usuario hace clic en el botón
   * "Verificar mi cuenta" del email. NO retorna JSON, sino que
   * redirige al frontend con un session token temporal.
   *
   * @param token - Token UUID de verificación (query param)
   * @param res - Objeto Response de Express para hacer redirect
   *
   * @example
   * // Redirección exitosa:
   * GET /auth/verify-email?token=abc123
   * → Redirect 302 → http://localhost:5173/registro?step=3&session=temp-token-xyz
   *
   * @example
   * // Redirección con error:
   * GET /auth/verify-email?token=invalid
   * → Redirect 302 → http://localhost:5173/registro?status=error&message=Token+inválido
   */
  @Get('verify-email')
  @ApiOperation({
    summary: 'Verificar email y completar registro (redirige con tokens encriptados o vista simple)',
    description: `
      Verifica el token de email enviado al usuario y completa el proceso de registro.

      **IMPORTANTE:** Este endpoint NO retorna JSON. Redirige al frontend según el tipo de registro.

      **Tipo 1 (Web):**
      1. Verifica el token y crea el usuario
      2. Genera accessToken y refreshToken directamente
      3. Encripta los tokens con AES-256-GCM
      4. Redirige a: \`/registro?step=3&data={tokensEncriptados}\`
      5. El frontend desencripta con la misma ENCRYPTION_KEY y guarda en localStorage

      **Tipo 2 (App):**
      1. Verifica el token y crea el usuario
      2. Redirige a: \`/verificacion-exitosa\` (vista simple de confirmación)
    `,
  })
  @ApiQuery({
    name: 'token',
    required: true,
    type: String,
    description: 'Token UUID de verificación enviado por email',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    type: String,
    description: 'Tipo de registro: 1=Web (redirige con tokens encriptados), 2=App (vista simple de verificación)',
    example: '1',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirección al frontend con session token (éxito) o mensaje de error',
    headers: {
      Location: {
        description: 'URL del frontend con query params',
        schema: {
          type: 'string',
          example: 'http://localhost:5173/registro?step=3&session=550e8400-e29b-41d4-a716-446655440000',
        },
      },
    },
  })
  async verifyEmail(
    @Query('token') token: string,
    @Query('type') type: string,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const registrationType = parseInt(type, 10) || 1;

    try {
      // Verificar el token y crear el usuario
      const result = await this.emailVerificationService.verifyToken(token);

      this.logger.log(
        `Verificación exitosa para usuario ${result.userId}. Tipo: ${registrationType}`,
      );

      if (registrationType === 1) {
        // TIPO WEB: Generar tokens, encriptarlos y redirigir con ellos
        const tokens = await this.emailVerificationService.generateTokensForUser(
          result.userId,
          result.email,
          result.roles || ['guest'],
        );

        const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY', '');
        const payload = {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          user: tokens.user,
        };

        const encryptedData = encryptPayload(payload, encryptionKey);
        const redirectUrl = `${frontendUrl}/registro?step=3&data=${encryptedData}`;
        res.redirect(redirectUrl);
      } else {
        // TIPO APP: Redirigir a vista sencilla de verificación exitosa
        const redirectUrl = `${frontendUrl}/verificacion-exitosa`;
        res.redirect(redirectUrl);
      }
    } catch (error) {
      this.logger.warn(`Error en verificación: ${error.message}`);

      const errorMessage = this.getErrorMessage(error);
      const encodedMessage = encodeURIComponent(errorMessage);

      if (registrationType === 1) {
        res.redirect(`${frontendUrl}/registro?status=error&message=${encodedMessage}`);
      } else {
        res.redirect(`${frontendUrl}/verificacion-exitosa?status=error&message=${encodedMessage}`);
      }
    }
  }

  /**
   * Intercambia un session token temporal por tokens de autenticación reales
   *
   * Este endpoint es llamado por el frontend después de ser redirigido
   * desde la verificación de email. Retorna el accessToken y refreshToken.
   *
   * @param dto - DTO con el sessionToken
   * @returns Tokens de autenticación y datos del usuario
   */
  @Post('exchange-session')
  @ApiOperation({
    summary: 'Intercambiar session token por tokens de autenticación',
    description: `
      Intercambia un session token temporal (obtenido después de verificar el email)
      por un accessToken y refreshToken reales.

      **Flujo de seguridad:**
      1. Usuario verifica su email
      2. Backend genera un session token temporal (válido 2 minutos, un solo uso)
      3. Redirige al frontend con ese session token en la URL
      4. Frontend llama a este endpoint con el session token
      5. Backend valida e invalida el session token
      6. Retorna accessToken y refreshToken reales

      **Ventajas:**
      - El JWT real nunca viaja en la URL
      - El session token solo funciona una vez
      - Expira en 2 minutos
      - Es como un "auto-login" seguro después de verificar el email
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Sesión intercambiada exitosamente',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        refreshToken: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
        expiresIn: { type: 'number', example: 900 },
        user: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            email: { type: 'string' },
            roles: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Session token inválido, expirado o ya utilizado' })
  async exchangeSession(@Body() dto: ExchangeSessionDto) {
    return this.emailVerificationService.exchangeSessionToken(dto.sessionToken);
  }

  /**
   * Obtiene un mensaje de error amigable para mostrar al usuario
   *
   * @param error - Error capturado
   * @returns Mensaje de error legible
   */
  private getErrorMessage(error: any): string {
    // Si el error tiene un mensaje personalizado, usarlo
    if (error.message) {
      return error.message;
    }

    // Mensaje genérico por defecto
    return 'Error al verificar el email. Por favor, intenta registrarte nuevamente.';
  }
}
