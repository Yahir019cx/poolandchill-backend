import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../../config/database.config';
import {
  VerifyEmailTokenResult,
  VerificationResponse,
} from './interfaces/pending-registration.interface';

/**
 * Servicio para manejar la verificación de email
 * Valida tokens y completa el proceso de registro
 */
@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Verifica el token de email y completa el registro del usuario
   * Llama al SP xsp_VerifyEmailToken
   */
  async verifyToken(token: string): Promise<VerificationResponse> {
    if (!token || token.trim() === '') {
      throw new BadRequestException('Token de verificación requerido');
    }

    this.logger.log(`Verificando token: ${token.substring(0, 8)}...`);

    try {
      const result = await this.databaseService.executeStoredProcedure<VerifyEmailTokenResult>(
        '[security].[xsp_VerifyEmailToken]',
        [{ name: 'VerificationToken', type: sql.NVarChar(255), value: token }],
        [
          { name: 'UserId', type: sql.UniqueIdentifier },
          { name: 'ErrorMessage', type: sql.NVarChar(500) },
        ],
      );

      const { UserId: userId, ErrorMessage: errorMessage } = result.output;

      if (errorMessage) {
        this.logger.warn(`Error de verificación: ${errorMessage}`);

        const errorLower = errorMessage.toLowerCase();

        if (errorLower.includes('expirado') || errorLower.includes('expired')) {
          throw new BadRequestException('El enlace de verificación ha expirado. Por favor, regístrate nuevamente.');
        }

        if (
          errorLower.includes('no encontrado') ||
          errorLower.includes('not found') ||
          errorLower.includes('no existe') ||
          errorLower.includes('inválido') ||
          errorLower.includes('invalid')
        ) {
          throw new NotFoundException('Token de verificación inválido o no encontrado.');
        }

        throw new InternalServerErrorException(errorMessage);
      }

      if (!userId) {
        throw new InternalServerErrorException('Error al crear el usuario. Intenta nuevamente.');
      }

      const userData = result.recordset?.[0];

      if (!userData) {
        this.logger.log(`Usuario creado exitosamente, ID: ${userId}`);
        return {
          success: true,
          userId: userId,
          email: '',
          firstName: '',
          lastName: '',
        };
      }

      this.logger.log(`Usuario verificado exitosamente: ${userData.email}, ID: ${userId}`);

      return {
        success: true,
        userId: userData.userId || userId,
        email: userData.email || '',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
      };
    } catch (error) {
      this.logger.error(`Error al verificar token: ${error.message}`);

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Error al verificar el email. Intenta nuevamente.');
    }
  }
}
