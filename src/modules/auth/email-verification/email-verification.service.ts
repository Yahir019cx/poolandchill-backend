import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';
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

  constructor(private readonly configService: ConfigService) {}

  /**
   * Verifica el token de email y completa el registro del usuario
   * Llama al SP xsp_VerifyEmailToken que:
   * 1. Valida que el token exista y no haya expirado
   * 2. Crea el usuario en la tabla de usuarios
   * 3. Marca IsEmailVerified = 1
   * 4. Elimina el registro pendiente
   *
   * @param token - Token UUID de verificación
   * @returns Datos del usuario creado
   * @throws BadRequestException si el token es inválido o expiró
   * @throws NotFoundException si el token no existe
   * @throws InternalServerErrorException si hay error en la base de datos
   */
  async verifyToken(token: string): Promise<VerificationResponse> {
    // Validar que se proporcione un token
    if (!token || token.trim() === '') {
      throw new BadRequestException('Token de verificación requerido');
    }

    this.logger.log(`Verificando token: ${token.substring(0, 8)}...`);

    let pool: sql.ConnectionPool | null = null;

    try {
      // Configurar conexión a SQL Server
      const config: sql.config = {
        server: this.configService.get<string>('DB_HOST', ''),
        database: this.configService.get<string>('DB_NAME', ''),
        user: this.configService.get<string>('DB_USER', ''),
        password: this.configService.get<string>('DB_PASS', ''),
        options: {
          encrypt: true,
          trustServerCertificate: false,
        },
      };

      pool = await sql.connect(config);

      // Ejecutar el stored procedure
      const result = await pool
        .request()
        .input('VerificationToken', sql.NVarChar(100), token)
        .output('UserId', sql.Int)
        .output('ErrorMessage', sql.NVarChar(500))
        .execute('[security].[xsp_VerifyEmailToken]');

      const userId = result.output.UserId;
      const errorMessage = result.output.ErrorMessage;

      // Verificar si hubo error en el SP
      if (errorMessage) {
        this.logger.warn(`Error de verificación: ${errorMessage}`);

        // Determinar el tipo de error
        const errorLower = errorMessage.toLowerCase();

        if (errorLower.includes('expirado') || errorLower.includes('expired')) {
          throw new BadRequestException('El enlace de verificación ha expirado. Por favor, regístrate nuevamente.');
        }

        if (errorLower.includes('no encontrado') ||
            errorLower.includes('not found') ||
            errorLower.includes('no existe') ||
            errorLower.includes('inválido') ||
            errorLower.includes('invalid')) {
          throw new NotFoundException('Token de verificación inválido o no encontrado.');
        }

        throw new InternalServerErrorException(errorMessage);
      }

      // Verificar que se creó el usuario
      if (!userId) {
        throw new InternalServerErrorException('Error al crear el usuario. Intenta nuevamente.');
      }

      // Obtener los datos del usuario del recordset
      const userData = result.recordset?.[0] as VerifyEmailTokenResult | undefined;

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

      // Re-lanzar excepciones HTTP conocidas
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Error al verificar el email. Intenta nuevamente.');
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  }
}
