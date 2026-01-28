import { Controller, Post, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LogoutService } from './logout.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LogoutResponse } from '../interfaces/login-response.interface';

/**
 * Controller para el endpoint de logout
 */
@ApiTags('Authentication - Login')
@Controller('auth')
export class LogoutController {
  constructor(private readonly logoutService: LogoutService) {}

  /**
   * Endpoint de logout
   * Revoca todos los Refresh Tokens del usuario (cierra sesión en todos los dispositivos)
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cerrar sesión (revocar todos los refresh tokens)',
    description: `
Cierra la sesión del usuario revocando todos sus Refresh Tokens.

**Comportamiento:**
- Invalida TODOS los Refresh Tokens del usuario
- El Access Token actual sigue siendo válido hasta que expire (máx 15 min)
- El usuario deberá iniciar sesión nuevamente en todos sus dispositivos

**Requiere autenticación:**
- Header: \`Authorization: Bearer {accessToken}\`

**Uso típico:**
1. El usuario hace clic en "Cerrar sesión"
2. El cliente llama a este endpoint
3. El cliente borra los tokens locales
4. El cliente redirige al login
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Logout exitoso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Sesión cerrada exitosamente' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado o token inválido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Token expirado' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Error al cerrar sesión. Intenta nuevamente.' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async logout(@Request() req: any): Promise<LogoutResponse> {
    const userId = req.user.userId;
    return this.logoutService.logout(userId);
  }
}
