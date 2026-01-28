import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as sql from 'mssql';
import { RefreshDto } from './dto/refresh.dto';
import { DatabaseService } from '../../../config/database.config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { RefreshResponse, RefreshSpUserData } from '../interfaces/login-response.interface';

/**
 * Servicio para manejar el refresh de tokens
 * Valida el Refresh Token y genera un nuevo Access Token
 */
@Injectable()
export class RefreshService {
  private readonly logger = new Logger(RefreshService.name);

  /** Duración del Access Token en segundos (15 minutos) */
  private readonly ACCESS_TOKEN_EXPIRATION = 900;

  constructor(
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Refresca el Access Token usando un Refresh Token válido
   * 1. Valida el Refresh Token en la base de datos
   * 2. Verifica que no esté expirado ni revocado
   * 3. Genera un nuevo Access Token
   */
  async refresh(refreshDto: RefreshDto): Promise<RefreshResponse> {
    const { refreshToken } = refreshDto;

    this.logger.log('Procesando solicitud de refresh token');

    try {
      // 1. Validar el refresh token en la base de datos
      const userData = await this.validateRefreshToken(refreshToken);

      // 2. Generar nuevo Access Token
      const roles = this.parseRoles(userData.Roles);
      const accessToken = this.generateAccessToken(
        userData.UserId,
        userData.Email,
        roles,
      );

      this.logger.log(`Token refrescado exitosamente para usuario: ${userData.UserId}`);

      return {
        accessToken,
        expiresIn: this.ACCESS_TOKEN_EXPIRATION,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(`Error al refrescar token: ${error.message}`);
      throw new InternalServerErrorException('Error al refrescar el token. Intenta nuevamente.');
    }
  }

  /**
   * Valida el Refresh Token llamando al SP xsp_ValidateRefreshToken
   */
  private async validateRefreshToken(token: string): Promise<RefreshSpUserData> {
    const result = await this.databaseService.executeStoredProcedure<RefreshSpUserData>(
      '[security].[xsp_ValidateRefreshToken]',
      [
        { name: 'Token', type: sql.NVarChar(255), value: token },
      ],
      [
        { name: 'UserId', type: sql.UniqueIdentifier },
        { name: 'IsValid', type: sql.Bit },
        { name: 'ErrorMessage', type: sql.NVarChar(500) },
      ],
    );

    const { IsValid, ErrorMessage } = result.output;

    // Verificar si el token es válido
    if (!IsValid) {
      this.logger.warn(`Refresh token inválido: ${ErrorMessage || 'Token no encontrado o expirado'}`);
      throw new UnauthorizedException('Refresh token inválido o expirado. Por favor, inicia sesión nuevamente.');
    }

    // Verificar que haya datos del usuario
    const userData = result.recordset?.[0];
    if (!userData) {
      this.logger.warn('Refresh token válido pero sin datos de usuario');
      throw new UnauthorizedException('Refresh token inválido. Por favor, inicia sesión nuevamente.');
    }

    // Verificar el estado de la cuenta (1 = Active)
    if (userData.AccountStatus !== 1) {
      this.logger.warn(`Cuenta no activa (status: ${userData.AccountStatus}) durante refresh`);
      throw new UnauthorizedException('Tu cuenta no está activa. Por favor, contacta a soporte.');
    }

    return userData;
  }

  /**
   * Genera un nuevo Access Token JWT
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
