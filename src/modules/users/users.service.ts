import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../config/database.config';
import { UpdateProfileDto } from './dto/update-profile.dto';

/**
 * Interface para el perfil completo del usuario
 */
export interface UserProfile {
  userId: string;
  email: string;
  phoneNumber: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isAgeVerified: boolean;
  isIdentityVerified: boolean;
  accountStatus: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  profileId: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  dateOfBirth: string | null;
  gender: number | null;
  isHostOnboarded: boolean;
  roles: string[];
  hasPassword: boolean;
  linkedProviders: string[];
  isHost: boolean;
  isStaff: boolean;
}

/**
 * Interface para el perfil actualizado
 */
export interface UpdatedProfile {
  userId: string;
  email: string;
  phoneNumber: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isAgeVerified: boolean;
  isIdentityVerified: boolean;
  profileId: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  dateOfBirth: string | null;
  gender: number | null;
  isHostOnboarded: boolean;
  updatedAt: Date;
  message: string;
}

/**
 * Interface para respuesta de actualización/eliminación de imagen
 */
export interface ImageUpdateResponse {
  userId: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  message: string;
}

/**
 * Servicio para gestionar el perfil de usuarios
 * Permite obtener y actualizar el perfil del usuario autenticado
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Obtiene el perfil completo del usuario autenticado
   *
   * @param userId - ID del usuario (extraído del JWT)
   * @returns Perfil completo del usuario
   * @throws NotFoundException si el usuario no existe
   */
  async getMyProfile(userId: string): Promise<UserProfile> {
    this.logger.log(`Obteniendo perfil para usuario: ${userId}`);

    try {
      const result = await this.databaseService.executeStoredProcedure(
        '[security].[xsp_get_user_profile]',
        [{ name: 'UserId', type: sql.UniqueIdentifier, value: userId }],
        [{ name: 'ErrorMessage', type: sql.NVarChar(500) }],
      );

      const { ErrorMessage: errorMessage } = result.output;

      if (errorMessage) {
        this.logger.warn(`Error al obtener perfil: ${errorMessage}`);

        if (
          errorMessage.toLowerCase().includes('no encontrado') ||
          errorMessage.toLowerCase().includes('not found')
        ) {
          throw new NotFoundException('Usuario no encontrado');
        }

        throw new BadRequestException(errorMessage);
      }

      const userData = result.recordset?.[0];

      if (!userData) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Formatear la respuesta
      const profile: UserProfile = {
        userId: userData.UserId,
        email: userData.Email,
        phoneNumber: userData.PhoneNumber || null,
        isEmailVerified: Boolean(userData.IsEmailVerified),
        isPhoneVerified: Boolean(userData.IsPhoneVerified),
        isAgeVerified: Boolean(userData.IsAgeVerified),
        isIdentityVerified: Boolean(userData.IsIdentityVerified),
        accountStatus: userData.AccountStatus || 'active',
        createdAt: userData.CreatedAt,
        lastLoginAt: userData.LastLoginAt || null,
        profileId: userData.ProfileId,
        firstName: userData.FirstName,
        lastName: userData.LastName,
        displayName: userData.DisplayName || null,
        bio: userData.Bio || null,
        profileImageUrl: userData.ProfileImageUrl || null,
        dateOfBirth: userData.DateOfBirth || null,
        gender: userData.Gender || null,
        isHostOnboarded: Boolean(userData.IsHostOnboarded),
        roles: userData.Roles ? userData.Roles.split(',').filter(Boolean) : ['guest'],
        hasPassword: Boolean(userData.HasPassword),
        linkedProviders: userData.LinkedProviders
          ? userData.LinkedProviders.split(',').filter(Boolean)
          : [],
        isHost: Boolean(userData.IsHost),
        isStaff: Boolean(userData.IsStaff),
      };

      this.logger.log(`Perfil obtenido exitosamente para: ${userData.Email}`);

      return profile;
    } catch (error) {
      this.logger.error(`Error al obtener perfil: ${error.message}`);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Error al obtener el perfil. Intenta nuevamente.');
    }
  }

  /**
   * Actualiza el perfil del usuario autenticado
   *
   * Campos editables:
   * - displayName: Debe contener partes del nombre real (validado por SP)
   * - bio: Máximo 500 caracteres
   * - profileImageUrl: URL de Firebase Storage
   *
   * @param userId - ID del usuario (extraído del JWT)
   * @param dto - Datos a actualizar
   * @returns Perfil actualizado
   * @throws BadRequestException si los datos son inválidos
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UpdatedProfile> {
    // Validar que al menos un campo venga en el body
    if (!dto.displayName && !dto.bio && !dto.profileImageUrl) {
      throw new BadRequestException(
        'Debes proporcionar al menos un campo para actualizar (displayName, bio, o profileImageUrl)',
      );
    }

    this.logger.log(`Actualizando perfil para usuario: ${userId}`);

    try {
      const result = await this.databaseService.executeStoredProcedure(
        '[security].[xsp_update_user_profile]',
        [
          { name: 'UserId', type: sql.UniqueIdentifier, value: userId },
          { name: 'DisplayName', type: sql.NVarChar(200), value: dto.displayName || null },
          { name: 'Bio', type: sql.NVarChar(500), value: dto.bio || null },
          { name: 'ProfileImageUrl', type: sql.NVarChar(500), value: dto.profileImageUrl || null },
        ],
        [{ name: 'ErrorMessage', type: sql.NVarChar(500) }],
      );

      const { ErrorMessage: errorMessage } = result.output;

      if (errorMessage) {
        this.logger.warn(`Error al actualizar perfil: ${errorMessage}`);

        // El SP valida que el displayName contenga partes del nombre real
        if (
          errorMessage.toLowerCase().includes('nombre') ||
          errorMessage.toLowerCase().includes('displayname')
        ) {
          throw new BadRequestException(errorMessage);
        }

        if (
          errorMessage.toLowerCase().includes('no encontrado') ||
          errorMessage.toLowerCase().includes('not found')
        ) {
          throw new NotFoundException('Usuario no encontrado');
        }

        throw new BadRequestException(errorMessage);
      }

      const updatedData = result.recordset?.[0];

      if (!updatedData) {
        throw new InternalServerErrorException('Error al actualizar el perfil');
      }

      // Formatear la respuesta
      const updatedProfile: UpdatedProfile = {
        userId: updatedData.UserId,
        email: updatedData.Email,
        phoneNumber: updatedData.PhoneNumber || null,
        isEmailVerified: Boolean(updatedData.IsEmailVerified),
        isPhoneVerified: Boolean(updatedData.IsPhoneVerified),
        isAgeVerified: Boolean(updatedData.IsAgeVerified),
        isIdentityVerified: Boolean(updatedData.IsIdentityVerified),
        profileId: updatedData.ProfileId,
        firstName: updatedData.FirstName,
        lastName: updatedData.LastName,
        displayName: updatedData.DisplayName || null,
        bio: updatedData.Bio || null,
        profileImageUrl: updatedData.ProfileImageUrl || null,
        dateOfBirth: updatedData.DateOfBirth || null,
        gender: updatedData.Gender || null,
        isHostOnboarded: Boolean(updatedData.IsHostOnboarded),
        updatedAt: updatedData.UpdatedAt || new Date(),
        message: updatedData.Message || 'Perfil actualizado exitosamente',
      };

      this.logger.log(`Perfil actualizado exitosamente para: ${updatedData.Email}`);

      return updatedProfile;
    } catch (error) {
      this.logger.error(`Error al actualizar perfil: ${error.message}`);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Error al actualizar el perfil. Intenta nuevamente.');
    }
  }

  /**
   * Actualiza la imagen de perfil del usuario
   *
   * @param userId - ID del usuario (extraído del JWT)
   * @param imageUrl - URL de la imagen en Firebase Storage
   * @returns Perfil con imagen actualizada
   * @throws BadRequestException si la URL no es válida
   */
  async updateProfileImage(userId: string, imageUrl: string): Promise<ImageUpdateResponse> {
    this.logger.log(`Actualizando imagen de perfil para usuario: ${userId}`);

    try {
      const result = await this.databaseService.executeStoredProcedure(
        '[security].[xsp_update_user_profile]',
        [
          { name: 'UserId', type: sql.UniqueIdentifier, value: userId },
          { name: 'ProfileImageUrl', type: sql.NVarChar(500), value: imageUrl },
          { name: 'DisplayName', type: sql.NVarChar(200), value: null },
          { name: 'Bio', type: sql.NVarChar(500), value: null },
        ],
        [{ name: 'ErrorMessage', type: sql.NVarChar(500) }],
      );

      const { ErrorMessage: errorMessage } = result.output;

      if (errorMessage) {
        this.logger.warn(`Error al actualizar imagen: ${errorMessage}`);
        throw new BadRequestException(errorMessage);
      }

      const updatedData = result.recordset?.[0];

      if (!updatedData) {
        throw new InternalServerErrorException('Error al actualizar la imagen');
      }

      this.logger.log(`Imagen de perfil actualizada para: ${updatedData.Email}`);

      return {
        userId: updatedData.UserId,
        firstName: updatedData.FirstName,
        lastName: updatedData.LastName,
        profileImageUrl: updatedData.ProfileImageUrl,
        message: updatedData.Message || 'Imagen de perfil actualizada exitosamente',
      };
    } catch (error) {
      this.logger.error(`Error actualizando imagen de perfil: ${error.message}`);

      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException('Error al actualizar imagen de perfil. Intenta nuevamente.');
    }
  }

  /**
   * Elimina la imagen de perfil del usuario (pone ProfileImageUrl = NULL)
   *
   * @param userId - ID del usuario (extraído del JWT)
   * @returns Perfil con imagen eliminada
   */
  async deleteProfileImage(userId: string): Promise<ImageUpdateResponse> {
    this.logger.log(`Eliminando imagen de perfil para usuario: ${userId}`);

    try {
      const result = await this.databaseService.executeStoredProcedure(
        '[security].[xsp_delete_profile_image]',
        [{ name: 'UserId', type: sql.UniqueIdentifier, value: userId }],
        [{ name: 'ErrorMessage', type: sql.NVarChar(500) }],
      );

      const { ErrorMessage: errorMessage } = result.output;

      if (errorMessage) {
        this.logger.warn(`Error al eliminar imagen: ${errorMessage}`);
        throw new BadRequestException(errorMessage);
      }

      const updatedData = result.recordset?.[0];

      if (!updatedData) {
        throw new InternalServerErrorException('Error al eliminar la imagen');
      }

      this.logger.log(`Imagen de perfil eliminada para usuario: ${userId}`);

      return {
        userId: updatedData.UserId,
        firstName: updatedData.FirstName,
        lastName: updatedData.LastName,
        profileImageUrl: null,
        message: updatedData.Message || 'Imagen de perfil eliminada exitosamente',
      };
    } catch (error) {
      this.logger.error(`Error eliminando imagen de perfil: ${error.message}`);

      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException('Error al eliminar imagen de perfil. Intenta nuevamente.');
    }
  }
}
