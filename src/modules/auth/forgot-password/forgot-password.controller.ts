import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { ForgotPasswordService } from './forgot-password.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

/**
 * Controller para la recuperación de contraseña
 *
 * Endpoints:
 * - POST /auth/forgot-password  → Solicita email de recuperación
 * - POST /auth/reset-password   → Restablece la contraseña con el token
 */
@ApiTags('Authentication - Password Recovery')
@Controller('auth')
export class ForgotPasswordController {
  constructor(private readonly forgotPasswordService: ForgotPasswordService) {}

  /**
   * Solicita la recuperación de contraseña
   * Envía un email con un enlace seguro para restablecer la contraseña
   *
   * NOTA: Siempre retorna 200 OK para no revelar si el email existe
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar recuperación de contraseña',
    description: `
      Envía un email con un enlace seguro para restablecer la contraseña.

      **Flujo:**
      1. El usuario envía su email
      2. Se genera un token UUID y se guarda en la BD
      3. Se encripta el token con AES-256-GCM (ENCRYPTION_KEY)
      4. Se envía un email con el enlace: \`FRONTEND_URL/forgot-password?token={encriptado}\`
      5. El enlace expira en 30 minutos

      **Seguridad:**
      - Siempre retorna 200 OK (no revela si el email existe)
      - Tokens anteriores se invalidan al solicitar uno nuevo
      - El token viaja encriptado en la URL
    `,
  })
  @ApiBody({
    type: ForgotPasswordDto,
    description: 'Email de la cuenta a recuperar',
    examples: {
      ejemplo: {
        summary: 'Solicitud de recuperación',
        value: {
          email: 'juan@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud procesada (siempre retorna éxito)',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Si el email está registrado, recibirás un correo con las instrucciones para restablecer tu contraseña.',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Email inválido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['Debe ser un email válido'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.forgotPasswordService.forgotPassword(dto);
  }

  /**
   * Restablece la contraseña del usuario
   * Valida el token encriptado y actualiza la contraseña
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restablecer contraseña con token',
    description: `
      Restablece la contraseña del usuario usando el token recibido por email.

      **Flujo:**
      1. El frontend desencripta el token de la URL (con la ENCRYPTION_KEY compartida)
      2. Envía el token encriptado original + nueva contraseña
      3. El backend desencripta, valida expiración, valida en BD
      4. Hashea la nueva contraseña con bcrypt
      5. Actualiza en la base de datos

      **Seguridad:**
      - Token de un solo uso (se invalida después de usarse)
      - Doble validación de expiración (payload + BD)
      - La nueva contraseña se hashea con bcrypt antes de almacenarse
    `,
  })
  @ApiBody({
    type: ResetPasswordDto,
    description: 'Token encriptado y nueva contraseña',
    examples: {
      ejemplo: {
        summary: 'Restablecer contraseña',
        value: {
          token: 'dGVzdC10b2tlbi1lbmNyeXB0ZWQ...',
          newPassword: 'NuevaPassword123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña restablecida exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión.',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Token inválido, expirado o contraseña no cumple requisitos',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'El enlace de recuperación ha expirado. Solicita uno nuevo.',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.forgotPasswordService.resetPassword(dto);
  }
}
