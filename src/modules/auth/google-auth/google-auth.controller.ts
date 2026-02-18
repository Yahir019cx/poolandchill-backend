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
import { GoogleLoginDto } from './dto/google-login.dto';
import { GoogleAuthService } from './google-auth.service';
import { GoogleLoginResponse } from '../interfaces/login-response.interface';

/**
 * Controller para login con Google (ID Token validation server-side).
 */
@ApiTags('Authentication - Google')
@Controller('auth')
export class GoogleAuthController {
  constructor(private readonly googleAuthService: GoogleAuthService) {}

  /**
   * Login con Google. El cliente envía solo el idToken; el backend lo valida contra Google.
   */
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Iniciar sesión con Google',
    description: `
Autentica con el ID Token de Google. El backend valida el token contra Google (issuer, audience, exp).
No se aceptan email, name ni sub enviados por el cliente; todo se extrae del token verificado.

**Flujo:**
1. Validar idToken con google-auth-library (issuer, audience, exp)
2. Llamar a security.xsp_login_with_provider con sub, email, name, picture del payload
3. Generar JWT y Refresh Token del sistema
4. Retornar datos del usuario, tokens e isNewUser
    `,
  })
  @ApiTooManyRequestsResponse({
    description: 'Demasiados intentos. Espera 1 minuto.',
  })
  @ApiBody({
    type: GoogleLoginDto,
    examples: {
      google: {
        summary: 'Login con Google',
        value: { idToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...' },
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
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos (ej. idToken vacío)',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de Google inválido o expirado, o error del proveedor',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Token de Google inválido o expirado' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Cuenta suspendida, eliminada o baneada',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async loginWithGoogle(@Body() dto: GoogleLoginDto): Promise<GoogleLoginResponse> {
    return this.googleAuthService.loginWithGoogle(dto);
  }
}
