import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { EmailVerificationService } from './email-verification.service';

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
   * Verifica el token de email y redirige al frontend
   *
   * Este endpoint es llamado cuando el usuario hace clic en el botón
   * "Verificar mi cuenta" del email. NO retorna JSON, sino que
   * redirige al frontend con el resultado en query params.
   *
   * @param token - Token UUID de verificación (query param)
   * @param res - Objeto Response de Express para hacer redirect
   *
   * @example
   * // Redirección exitosa:
   * GET /auth/verify-email?token=abc123
   * → Redirect 302 → https://poolandchill.com.mx/verif-email?status=success
   *
   * @example
   * // Redirección con error:
   * GET /auth/verify-email?token=invalid
   * → Redirect 302 → https://poolandchill.com.mx/verif-email?status=error&message=Token+inválido
   */
  @Get('verify-email')
  @ApiOperation({
    summary: 'Verificar email y completar registro (redirige al frontend)',
    description: `
      Verifica el token de email enviado al usuario y completa el proceso de registro.

      **IMPORTANTE:** Este endpoint NO retorna JSON. En su lugar, redirige al frontend
      con el resultado de la verificación en los query parameters.

      **Flujo:**
      1. El usuario hace clic en el botón del email
      2. El navegador abre esta URL con el token
      3. El backend verifica el token y crea el usuario
      4. El backend redirige al frontend con el resultado

      **Redirecciones:**
      - Éxito: \`${'{FRONTEND_URL}'}/verif-email?status=success\`
      - Error: \`${'{FRONTEND_URL}'}/verif-email?status=error&message={mensaje}\`
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
    description: 'Redirección al frontend con status=success o status=error',
    headers: {
      Location: {
        description: 'URL del frontend con query params de resultado',
        schema: {
          type: 'string',
          example: 'https://poolandchill.com.mx/verif-email?status=success',
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
      'https://poolandchill.com.mx',
    );
    const verificationPage = `${frontendUrl}/verif-email`;

    try {
      // Intentar verificar el token
      const result = await this.emailVerificationService.verifyToken(token);

      this.logger.log(
        `Verificación exitosa para usuario ${result.userId}. Redirigiendo a frontend.`,
      );

      // Redirigir al frontend con éxito
      res.redirect(`${verificationPage}?status=success`);
    } catch (error) {
      this.logger.warn(`Error en verificación: ${error.message}`);

      // Obtener mensaje de error amigable
      const errorMessage = this.getErrorMessage(error);

      // Codificar el mensaje para URL
      const encodedMessage = encodeURIComponent(errorMessage);

      // Redirigir al frontend con error
      res.redirect(`${verificationPage}?status=error&message=${encodedMessage}`);
    }
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
