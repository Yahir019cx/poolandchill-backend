import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  UsersService,
  UserProfile,
  UpdatedProfile,
  ImageUpdateResponse,
  HostOnboardingResponse,
} from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateImageDto } from './dto/update-image.dto';

/**
 * Controller para gestión del perfil de usuarios
 * Todos los endpoints están protegidos con JWT
 *
 * El usuario solo puede ver y editar su propio perfil
 * (userId se extrae del token JWT)
 */
@ApiTags('Users - Profile')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Obtiene el perfil del usuario autenticado
   *
   * @param req - Request con el usuario del token JWT
   * @returns Perfil completo del usuario
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener mi perfil',
    description: `
      Obtiene el perfil completo del usuario autenticado.

      **Requiere autenticación:** Token JWT válido en el header Authorization.

      **Respuesta incluye:**
      - Datos de cuenta (email, verificaciones, estado)
      - Datos de perfil (nombre, bio, imagen)
      - Roles y permisos (guest, host, staff)
      - Proveedores vinculados (google, facebook)
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          example: '3DDA3AA3-F90F-4B2B-AC23-346C8B9E537D',
        },
        email: { type: 'string', example: 'juan@example.com' },
        phoneNumber: { type: 'string', nullable: true, example: null },
        isEmailVerified: { type: 'boolean', example: true },
        isPhoneVerified: { type: 'boolean', example: false },
        isAgeVerified: { type: 'boolean', example: true },
        isIdentityVerified: { type: 'boolean', example: false },
        accountStatus: { type: 'string', example: 'active' },
        createdAt: { type: 'string', format: 'date-time' },
        lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
        profileId: { type: 'string' },
        firstName: { type: 'string', example: 'Juan Alberto' },
        lastName: { type: 'string', example: 'Pérez Rosales' },
        displayName: { type: 'string', nullable: true, example: 'Juan Pérez' },
        bio: {
          type: 'string',
          nullable: true,
          example: 'Amante de las albercas y el relax',
        },
        profileImageUrl: { type: 'string', nullable: true },
        dateOfBirth: {
          type: 'string',
          format: 'date',
          nullable: true,
          example: '1995-03-15',
        },
        gender: { type: 'number', nullable: true, example: 1 },
        isHostOnboarded: {
          type: 'number',
          example: 0,
          description: '0=No es host, 1=Nuevo host, 2=Onboarding completado',
          enum: [0, 1, 2],
        },
        roles: { type: 'array', items: { type: 'string' }, example: ['guest'] },
        hasPassword: { type: 'boolean', example: true },
        linkedProviders: {
          type: 'array',
          items: { type: 'string' },
          example: [],
        },
        isHost: { type: 'boolean', example: false },
        isStaff: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token JWT inválido o expirado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Usuario no encontrado' },
      },
    },
  })
  async getMyProfile(@Request() req: any): Promise<UserProfile> {
    const userId = req.user.userId;
    return this.usersService.getMyProfile(userId);
  }

  /**
   * Actualiza el perfil del usuario autenticado
   *
   * @param req - Request con el usuario del token JWT
   * @param dto - Datos a actualizar
   * @returns Perfil actualizado
   */
  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar mi perfil',
    description: `
      Actualiza el perfil del usuario autenticado.

      **Requiere autenticación:** Token JWT válido en el header Authorization.

      **Campos editables:**
      - \`displayName\`: Nombre a mostrar (DEBE contener partes de tu nombre real)
      - \`bio\`: Biografía (máximo 500 caracteres)
      - \`profileImageUrl\`: URL de imagen en Firebase Storage

      **Campos NO editables (por seguridad):**
      - firstName, lastName (nombre real fijo)
      - email (verificado)
      - dateOfBirth, gender (datos de perfil fijos)

      **Validación de displayName:**
      El nombre a mostrar debe contener partes de tu nombre real.
      Ejemplo: Si tu nombre es "Juan Alberto Pérez Rosales", puedes usar:
      - "Juan Pérez" ✓
      - "Alberto Rosales" ✓
      - "J. Pérez" ✓
      - "El Tiburón" ✗ (rechazado)
    `,
  })
  @ApiBody({
    type: UpdateProfileDto,
    description: 'Datos del perfil a actualizar (todos opcionales)',
    examples: {
      actualizar_bio: {
        summary: 'Solo actualizar biografía',
        value: {
          bio: 'Amante de las albercas y el relax. Buscando nuevas experiencias.',
        },
      },
      actualizar_displayName: {
        summary: 'Actualizar nombre a mostrar',
        value: {
          displayName: 'Juan Pérez',
        },
      },
      actualizar_todo: {
        summary: 'Actualizar múltiples campos',
        value: {
          displayName: 'Alberto Rosales',
          bio: 'Nueva biografía actualizada',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil actualizado exitosamente',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        email: { type: 'string' },
        firstName: { type: 'string', example: 'Juan Alberto' },
        lastName: { type: 'string', example: 'Pérez Rosales' },
        displayName: { type: 'string', example: 'Juan Pérez' },
        bio: { type: 'string', example: 'Nueva biografía actualizada' },
        profileImageUrl: { type: 'string', nullable: true },
        updatedAt: { type: 'string', format: 'date-time' },
        message: { type: 'string', example: 'Perfil actualizado exitosamente' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos (ej: displayName no válido)',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example:
            'El nombre a mostrar debe contener partes de tu nombre real (Juan Alberto Pérez Rosales)',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token JWT inválido o expirado',
  })
  async updateMyProfile(
    @Request() req: any,
    @Body() dto: UpdateProfileDto,
  ): Promise<UpdatedProfile> {
    const userId = req.user.userId;
    return this.usersService.updateProfile(userId, dto);
  }

  /**
   * Actualiza la foto de perfil del usuario autenticado
   *
   * @param req - Request con el usuario del token JWT
   * @param dto - URL de la imagen en Firebase Storage
   * @returns Perfil con imagen actualizada
   */
  @Patch('me/image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar foto de perfil',
    description: `
      Actualiza la foto de perfil del usuario con una URL de Firebase Storage.

      **Requiere autenticación:** Token JWT válido en el header Authorization.

      **Flujo:**
      1. Flutter sube imagen a Firebase Storage
      2. Firebase retorna URL
      3. Flutter envía URL a este endpoint
      4. Backend valida y guarda en BD

      **Validación:**
      - Solo se aceptan URLs de Firebase Storage
      - Patrón: \`https://firebasestorage.googleapis.com/...\`
    `,
  })
  @ApiBody({
    type: UpdateImageDto,
    description: 'URL de la imagen en Firebase Storage',
    examples: {
      imagen_firebase: {
        summary: 'URL de Firebase Storage',
        value: {
          profileImageUrl:
            'https://firebasestorage.googleapis.com/v0/b/poolandchillapp.firebasestorage.app/o/profiles%2Fuser123%2Fphoto.jpg?alt=media',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Imagen actualizada exitosamente',
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          example: '3DDA3AA3-F90F-4B2B-AC23-346C8B9E537D',
        },
        firstName: { type: 'string', example: 'Juan Alberto' },
        lastName: { type: 'string', example: 'Pérez Rosales' },
        profileImageUrl: {
          type: 'string',
          example:
            'https://firebasestorage.googleapis.com/v0/b/poolandchillapp.firebasestorage.app/o/profiles%2Fuser123%2Fphoto.jpg?alt=media',
        },
        message: {
          type: 'string',
          example: 'Imagen de perfil actualizada exitosamente',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'URL inválida o no es de Firebase Storage',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Solo se permiten imágenes de Firebase Storage',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token JWT inválido o expirado',
  })
  async updateProfileImage(
    @Request() req: any,
    @Body() dto: UpdateImageDto,
  ): Promise<ImageUpdateResponse> {
    const userId = req.user.userId;
    return this.usersService.updateProfileImage(userId, dto.profileImageUrl);
  }

  /**
   * Elimina la foto de perfil del usuario autenticado
   *
   * @param req - Request con el usuario del token JWT
   * @returns Perfil con imagen eliminada (null)
   */
  @Delete('me/image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar foto de perfil',
    description: `
      Elimina la foto de perfil del usuario (vuelve a NULL).

      **Requiere autenticación:** Token JWT válido en el header Authorization.

      **Nota:** La imagen NO se elimina de Firebase Storage.
      Solo se elimina la referencia en la base de datos.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Imagen eliminada exitosamente',
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          example: '3DDA3AA3-F90F-4B2B-AC23-346C8B9E537D',
        },
        firstName: { type: 'string', example: 'Juan Alberto' },
        lastName: { type: 'string', example: 'Pérez Rosales' },
        profileImageUrl: { type: 'null', example: null },
        message: {
          type: 'string',
          example: 'Imagen de perfil eliminada exitosamente',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token JWT inválido o expirado',
  })
  async deleteProfileImage(@Request() req: any): Promise<ImageUpdateResponse> {
    const userId = req.user.userId;
    return this.usersService.deleteProfileImage(userId);
  }

  /**
   * Completa el onboarding de anfitrión
   * Cambia IsHostOnboarded de 1 a 2
   *
   * @param req - Request con el usuario del token JWT
   * @returns Datos actualizados del usuario
   */
  @Post('me/complete-host-onboarding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Completar onboarding de anfitrión',
    description: `
      Marca que el usuario completó las pantallas de bienvenida como host.

      **Requiere autenticación:** Token JWT válido en el header Authorization.

      **Cambio en la BD:**
      - IsHostOnboarded: 1 → 2

      **Cuándo llamar:**
      - Después de que el usuario termine de ver las pantallas de onboarding
      - Solo si isHost=true e isHostOnboarded=1
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Introducción de anfitrión completada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Introducción de anfitrión completada',
        },
        data: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            firstName: { type: 'string', example: 'Juan' },
            lastName: { type: 'string', example: 'Pérez' },
            isHostOnboarded: {
              type: 'number',
              example: 2,
              description:
                '0=No es host, 1=Nuevo host, 2=Onboarding completado',
              enum: [0, 1, 2],
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Error al completar onboarding',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Usuario no es host o ya completó el onboarding',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token JWT inválido o expirado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Usuario no encontrado' },
      },
    },
  })
  async completeHostOnboarding(
    @Request() req: any,
  ): Promise<HostOnboardingResponse> {
    const userId = req.user.userId;
    return this.usersService.completeHostOnboarding(userId);
  }

  @Get('host')
  async getAllUsersHost() {
    try {
      const users = await this.usersService.getUserDataHost();
      return users.map((user) => ({
        userId: user.UserId,
        displayName: user.DisplayName,
        profileImageUrl: user.ProfileImageUrl,
        email: user.Email,
        isIdentityVerified: user.IsIdentityVerified,
      }));
    } catch (error) {
      //console.error('Error al obtener users host:', error);
      throw new InternalServerErrorException('Error al obtener los usuarios');
    }
  }
}
