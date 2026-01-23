import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { RefreshDto } from './dto/refresh.dto';
import { RefreshService } from './refresh.service';
import { RefreshResponse } from '../interfaces/login-response.interface';

/**
 * Controller para el endpoint de refresh token
 */
@ApiTags('Authentication - Login')
@Controller('auth')
export class RefreshController {
  constructor(private readonly refreshService: RefreshService) {}

  /**
   * Endpoint para refrescar el Access Token
   * Usa el Refresh Token para obtener un nuevo Access Token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refrescar Access Token',
    description: `
Genera un nuevo Access Token usando un Refresh Token válido.

**Flujo:**
1. El cliente envía su Refresh Token cuando el Access Token expira
2. El servidor valida que el Refresh Token exista, no esté expirado y no haya sido revocado
3. Si es válido, genera un nuevo Access Token
4. El cliente usa el nuevo Access Token para continuar haciendo requests

**Uso típico en el cliente:**
- Cuando una request retorna 401 "Token expirado"
- El cliente automáticamente llama a este endpoint
- Guarda el nuevo Access Token y reintenta la request original
- El usuario no nota la interrupción (experiencia fluida)

**Cuándo falla:**
- Si el Refresh Token está expirado (90 días sin usar la app)
- Si el Refresh Token fue revocado (logout en otro dispositivo)
- Si la cuenta fue suspendida/baneada
→ El cliente debe redirigir al usuario al login
    `,
  })
  @ApiBody({
    type: RefreshDto,
    examples: {
      normal: {
        summary: 'Refresh token',
        value: {
          refreshToken: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token refrescado exitosamente',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          description: 'Nuevo JWT Access Token (válido por 15 minutos)',
        },
        expiresIn: {
          type: 'number',
          example: 900,
          description: 'Tiempo de expiración del Access Token en segundos',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['El refresh token es obligatorio', 'El refresh token debe ser un UUID válido'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido, expirado o revocado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Refresh token inválido o expirado. Por favor, inicia sesión nuevamente.' },
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
        message: { type: 'string', example: 'Error al refrescar el token. Intenta nuevamente.' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async refresh(@Body() refreshDto: RefreshDto): Promise<RefreshResponse> {
    return this.refreshService.refresh(refreshDto);
  }
}
