import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../../config/database.config';
import { LogoutResponse } from '../interfaces/login-response.interface';

/**
 * Servicio para manejar el logout de usuarios
 * Revoca todos los Refresh Tokens del usuario
 */
@Injectable()
export class LogoutService {
  private readonly logger = new Logger(LogoutService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Procesa el logout de un usuario
   * Revoca todos los Refresh Tokens asociados al usuario
   */
  async logout(userId: string): Promise<LogoutResponse> {
    this.logger.log(`Procesando logout para usuario: ${userId}`);

    try {
      const result = await this.databaseService.executeStoredProcedure(
        '[security].[xsp_RevokeRefreshTokens]',
        [
          { name: 'UserId', type: sql.UniqueIdentifier, value: userId },
          { name: 'Token', type: sql.NVarChar(255), value: null }, // NULL = revocar todos
        ],
        [
          { name: 'RevokedCount', type: sql.Int },
          { name: 'ErrorMessage', type: sql.NVarChar(500) },
        ],
      );

      const { RevokedCount, ErrorMessage } = result.output;

      if (ErrorMessage) {
        this.logger.error(`Error al revocar tokens: ${ErrorMessage}`);
        throw new InternalServerErrorException('Error al cerrar sesión. Intenta nuevamente.');
      }

      this.logger.log(`Logout exitoso para usuario ${userId}. Tokens revocados: ${RevokedCount || 0}`);

      return {
        success: true,
        message: 'Sesión cerrada exitosamente',
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error(`Error en logout para ${userId}: ${error.message}`);
      throw new InternalServerErrorException('Error al cerrar sesión. Intenta nuevamente.');
    }
  }

  /**
   * Revoca un Refresh Token específico (logout de un solo dispositivo)
   */
  async logoutSingle(userId: string, refreshToken: string): Promise<LogoutResponse> {
    this.logger.log(`Procesando logout parcial para usuario: ${userId}`);

    try {
      const result = await this.databaseService.executeStoredProcedure(
        '[security].[xsp_RevokeRefreshTokens]',
        [
          { name: 'UserId', type: sql.UniqueIdentifier, value: userId },
          { name: 'Token', type: sql.NVarChar(255), value: refreshToken },
        ],
        [
          { name: 'RevokedCount', type: sql.Int },
          { name: 'ErrorMessage', type: sql.NVarChar(500) },
        ],
      );

      const { RevokedCount, ErrorMessage } = result.output;

      if (ErrorMessage) {
        this.logger.error(`Error al revocar token específico: ${ErrorMessage}`);
        throw new InternalServerErrorException('Error al cerrar sesión. Intenta nuevamente.');
      }

      this.logger.log(`Logout parcial exitoso. Tokens revocados: ${RevokedCount || 0}`);

      return {
        success: true,
        message: 'Sesión cerrada exitosamente en este dispositivo',
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error(`Error en logout parcial: ${error.message}`);
      throw new InternalServerErrorException('Error al cerrar sesión. Intenta nuevamente.');
    }
  }
}
