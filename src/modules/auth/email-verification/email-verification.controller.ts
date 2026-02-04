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
    summary: 'Verificar email y completar registro (redirige con session token)',
    description: `
      Verifica el token de email enviado al usuario y completa el proceso de registro.

      **IMPORTANTE:** Este endpoint NO retorna JSON. En su lugar, redirige al frontend
      con un session token temporal que debe ser intercambiado por tokens reales.

      **Flujo completo:**
      1. El usuario hace clic en el botón del email
      2. El navegador abre esta URL con el token de verificación
      3. El backend verifica el token y crea el usuario
      4. El backend genera un session token temporal (válido 2 minutos, un solo uso)
      5. Redirige al frontend al paso 3 con el session token en la URL
      6. El frontend llama a POST /auth/exchange-session con el session token
      7. Recibe el accessToken y refreshToken reales de forma segura
      8. El usuario completa los pasos 3-10 del registro

      **Ventajas de seguridad:**
      - El JWT real nunca viaja en la URL
      - El session token solo se puede usar una vez
      - Expira en 2 minutos
      - Es como un "auto-login" seguro

      **Redirecciones:**
      - Éxito: \`${'{FRONTEND_URL}'}/registro?step=3&session={sessionToken}\`
      - Error: \`${'{FRONTEND_URL}'}/registro?status=error&message={mensaje}\`
    `,
  })
  @ApiQuery({
    name: 'token',
    required: true,
    type: String,
    description: 'Token UUID de verificación enviado por email',
    example: '550e8400-e29b-41d4-a716-446655440000',
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
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const registrationPage = `${frontendUrl}/registro`;

    try {
      // Intentar verificar el token
      const result = await this.emailVerificationService.verifyToken(token);

      this.logger.log(
        `Verificación exitosa para usuario ${result.userId}. Redirigiendo a frontend.`,
      );

      // Redirigir al frontend al paso 3 con el session token temporal
      const redirectUrl = `${registrationPage}?step=3&session=${encodeURIComponent(result.sessionToken)}`;
      res.redirect(redirectUrl);
    } catch (error) {
      this.logger.warn(`Error en verificación: ${error.message}`);

      // Obtener mensaje de error amigable
      const errorMessage = this.getErrorMessage(error);

      // Codificar el mensaje para URL
      const encodedMessage = encodeURIComponent(errorMessage);

      // Redirigir al frontend con error (al paso 1 para que intenten de nuevo)
      res.redirect(`${registrationPage}?status=error&message=${encodedMessage}`);
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
