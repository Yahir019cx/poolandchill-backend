import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { RegisterService } from './register.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponse } from '../email-verification/interfaces/pending-registration.interface';

/**
 * Controller para el registro de nuevos usuarios
 * Maneja el endpoint POST /auth/register
 */
@ApiTags('Authentication - Register')
@Controller('auth')
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  /**
   * Inicia el proceso de registro de un nuevo usuario
   * Valida los datos, crea un registro pendiente y envía email de verificación
   *
   * @param registerDto - Datos del usuario a registrar
   * @returns Mensaje indicando que se envió el email de verificación
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Iniciar registro de usuario',
    description: `
      Inicia el proceso de registro de un nuevo usuario.

      **Flujo:**
      1. Valida los datos de entrada
      2. Hashea la contraseña con bcrypt
      3. Genera un token de verificación único
      4. Guarda el registro pendiente en la base de datos
      5. Envía un email con el link de verificación

      **Importante:**
      - El usuario debe verificar su email dentro de las próximas 24 horas
      - El link del email apunta directamente al backend
      - No se puede iniciar sesión hasta verificar el email
    `,
  })
  @ApiBody({
    type: RegisterDto,
    description: 'Datos del usuario a registrar',
    examples: {
      usuario_web: {
        summary: 'Usuario desde Web (type=1)',
        value: {
          email: 'pyahirsvds@gmail.com',
          firstName: 'Yahir',
          lastName: 'Sanchez',
          phoneNumber: '+5215512345678',
          password: 'Py00448829#',
          type: 1,
          dateOfBirth: '2002-10-19',
          gender: 1,
        },
      },
      usuario_app: {
        summary: 'Usuario desde App (type=2)',
        value: {
          email: 'pyahirsvds@gmail.com',
          firstName: 'Yahir',
          lastName: 'Sanchez',
          phoneNumber: '+5215512345678',
          password: 'Py00448829#',
          type: 2,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Registro iniciado exitosamente. Se envió email de verificación.',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: 'Registro iniciado. Revisa tu email para verificar tu cuenta.',
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
          example: [
            'Debe ser un email válido',
            'La contraseña debe incluir al menos una mayúscula, una minúscula y un número',
          ],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'El email ya está registrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example: 'El email ya está registrado. Por favor, inicia sesión o usa otro email.',
        },
        error: { type: 'string', example: 'Conflict' },
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
        message: {
          type: 'string',
          example: 'Error al procesar el registro. Intenta nuevamente.',
        },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async register(@Body() registerDto: RegisterDto): Promise<RegisterResponse> {
    return this.registerService.register(registerDto);
  }
}
