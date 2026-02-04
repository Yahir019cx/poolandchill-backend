import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../../config/database.config';
import {
  VerifyEmailTokenResult,
  VerificationResponse,
} from './interfaces/pending-registration.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Servicio para manejar la verificación de email
 * Valida tokens y completa el proceso de registro
 */
@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

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

        // Crear sesión temporal para auto-login
        const sessionToken = await this.createVerificationSession(userId, '', ['guest']);

        return {
          success: true,
          userId: userId,
          email: '',
          firstName: '',
          lastName: '',
          sessionToken,
        };
      }

      this.logger.log(`Usuario verificado exitosamente: ${userData.email}, ID: ${userId}`);

      // Crear sesión temporal para auto-login
      const roles = this.parseRoles(userData.roles);
      const sessionToken = await this.createVerificationSession(
        userData.userId || userId,
        userData.email || '',
        roles,
      );

      return {
        success: true,
        userId: userData.userId || userId,
        email: userData.email || '',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        sessionToken,
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

  /**
   * Crea una sesión temporal de verificación (auto-login)
   * El session token expira en 2 minutos y solo se puede usar una vez
   */
  private async createVerificationSession(
    userId: string,
    email: string,
    roles: string[],
  ): Promise<string> {
    const sessionToken = uuidv4();

    // Guardar en la BD con expiración de 2 minutos
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 2);

    await this.databaseService.executeStoredProcedure(
      '[security].[xsp_CreateVerificationSession]',
      [
        { name: 'UserId', type: sql.UniqueIdentifier, value: userId },
        { name: 'SessionToken', type: sql.NVarChar(255), value: sessionToken },
        { name: 'Email', type: sql.NVarChar(255), value: email },
        { name: 'Roles', type: sql.NVarChar(500), value: roles.join(',') },
        { name: 'ExpiresAt', type: sql.DateTime2, value: expiresAt },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    return sessionToken;
  }

  /**
   * Intercambia un session token por access token y refresh token reales
   * El session token se invalida después de usarse
   */
  async exchangeSessionToken(sessionToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: {
      userId: string;
      email: string;
      roles: string[];
    };
  }> {
    if (!sessionToken || sessionToken.trim() === '') {
      throw new BadRequestException('Session token requerido');
    }

    this.logger.log(`Intercambiando session token: ${sessionToken.substring(0, 8)}...`);

    // Validar y obtener datos del session token
    const result = await this.databaseService.executeStoredProcedure(
      '[security].[xsp_ExchangeVerificationSession]',
      [
        { name: 'SessionToken', type: sql.NVarChar(255), value: sessionToken },
      ],
      [
        { name: 'UserId', type: sql.UniqueIdentifier },
        { name: 'Email', type: sql.NVarChar(255) },
        { name: 'Roles', type: sql.NVarChar(500) },
        { name: 'ErrorMessage', type: sql.NVarChar(500) },
      ],
    );

    const { UserId, Email, Roles, ErrorMessage } = result.output;

    if (ErrorMessage) {
      this.logger.warn(`Error intercambiando session: ${ErrorMessage}`);

      const errorLower = ErrorMessage.toLowerCase();

      if (errorLower.includes('expirado') || errorLower.includes('expired')) {
        throw new BadRequestException('La sesión ha expirado. Por favor, verifica tu email nuevamente.');
      }

      if (errorLower.includes('inválido') || errorLower.includes('invalid') || errorLower.includes('usado')) {
        throw new BadRequestException('Sesión inválida o ya utilizada.');
      }

      throw new InternalServerErrorException(ErrorMessage);
    }

    if (!UserId) {
      throw new BadRequestException('Sesión inválida');
    }

    // Parsear roles
    const roles = this.parseRoles(Roles);

    // Generar Access Token JWT
    const accessToken = this.generateAccessToken(UserId, Email, roles);

    // Generar y guardar Refresh Token
    const refreshToken = await this.createRefreshToken(UserId);

    this.logger.log(`Session intercambiada exitosamente para usuario: ${UserId}`);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutos
      user: {
        userId: UserId,
        email: Email,
        roles,
      },
    };
  }

  /**
   * Genera el Access Token JWT
   */
  private generateAccessToken(userId: string, email: string, roles: string[]): string {
    const payload: JwtPayload = {
      sub: userId,
      email,
      roles,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Crea y guarda un nuevo Refresh Token en la base de datos
   */
  private async createRefreshToken(userId: string): Promise<string> {
    const token = uuidv4();

    // Calcular fecha de expiración (90 días)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    const result = await this.databaseService.executeStoredProcedure(
      '[security].[xsp_CreateRefreshToken]',
      [
        { name: 'UserId', type: sql.UniqueIdentifier, value: userId },
        { name: 'Token', type: sql.NVarChar(255), value: token },
        { name: 'ExpiresAt', type: sql.DateTime2, value: expiresAt },
      ],
      [
        { name: 'TokenId', type: sql.UniqueIdentifier },
        { name: 'ErrorMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ErrorMessage } = result.output;

    if (ErrorMessage) {
      this.logger.error(`Error al crear refresh token: ${ErrorMessage}`);
      throw new InternalServerErrorException('Error al generar el token de sesión');
    }

    return token;
  }

  /**
   * Parsea el string de roles separados por comas a un array
   */
  private parseRoles(rolesString: string | null): string[] {
    if (!rolesString) {
      return ['guest'];
    }

    return rolesString
      .split(',')
      .map((role) => role.trim().toLowerCase())
      .filter((role) => role.length > 0);
  }
}
