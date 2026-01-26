import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthThrottlerGuard } from '../guards/throttler.guard';
import { LoginDto } from './dto/login.dto';
import { LoginService } from './login.service';
import { LoginResponse } from '../interfaces/login-response.interface';

/**
 * Controller para el endpoint de login
 */
@ApiTags('Authentication - Login')
@Controller('auth')
export class LoginController {
  constructor(private readonly loginService: LoginService) {}

  /**
   * Endpoint de login con email y password
   * Retorna Access Token (JWT) y Refresh Token (UUID)
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 intentos por minuto por IP
  @ApiOperation({
    summary: 'Iniciar sesión con email y password',
    description: `
Autentica al usuario con sus credenciales y retorna los tokens de acceso.

**Flujo:**
1. Valida email y password contra la base de datos
2. Si las credenciales son correctas, genera Access Token (JWT, 15 min) y Refresh Token (UUID, 90 días)
3. Retorna tokens y datos básicos del usuario

**Seguridad:**
- Rate limit: 5 intentos por minuto por IP
- La cuenta se bloquea después de 5 intentos fallidos (15 minutos)
- Los errores son genéricos para no revelar si el email existe
    `,
  })
  @ApiTooManyRequestsResponse({
    description: 'Demasiados intentos de login. Espera 1 minuto.',
  })
  @ApiBody({
    type: LoginDto,
    examples: {
      normal: {
        summary: 'Login normal',
        value: {
          email: 'usuario@example.com',
          password: 'Password123!',
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
        accessToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          description: 'JWT Access Token (válido por 15 minutos)',
        },
        refreshToken: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440000',
          description: 'Refresh Token UUID (válido por 90 días)',
        },
        expiresIn: {
          type: 'number',
          example: 900,
          description: 'Tiempo de expiración del Access Token en segundos',
        },
        user: {
          type: 'object',
          properties: {
            userId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            email: { type: 'string', example: 'usuario@example.com' },
            firstName: { type: 'string', example: 'Juan' },
            lastName: { type: 'string', example: 'Pérez' },
            displayName: { type: 'string', example: 'Juan P.', nullable: true },
            profileImageUrl: { type: 'string', nullable: true },
            roles: { type: 'array', items: { type: 'string' }, example: ['guest'] },
            isEmailVerified: { type: 'boolean', example: true },
            isPhoneVerified: { type: 'boolean', example: false },
            isHost: { type: 'boolean', example: false },
            isStaff: { type: 'boolean', example: false },
            accountStatus: { type: 'number', example: 1 },
            createdAt: { type: 'string', format: 'date-time' },
            lastLoginAt: { type: 'string', format: 'date-time' },
          },
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
          example: ['El email es obligatorio', 'La contraseña debe tener al menos 8 caracteres'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales incorrectas o cuenta bloqueada',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Email o contraseña incorrectos' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Cuenta suspendida, eliminada o baneada',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Tu cuenta ha sido suspendida. Contacta a soporte para más información.' },
        error: { type: 'string', example: 'Forbidden' },
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
        message: { type: 'string', example: 'Error al procesar el login. Intenta nuevamente.' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return this.loginService.login(loginDto);
  }
}
