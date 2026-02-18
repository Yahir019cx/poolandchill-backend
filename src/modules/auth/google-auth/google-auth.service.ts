import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import * as sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../../config/database.config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import {
  GoogleLoginResponse,
  LoginUserData,
} from '../interfaces/login-response.interface';
import { GoogleLoginDto } from './dto/google-login.dto';

/** Payload verificado del ID Token de Google (solo campos usados) */
interface GoogleTokenPayload {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  iss: string;
  aud: string;
  exp: number;
}

/** Recordset de [security].[xsp_get_user_profile] para mapear a LoginUserData */
interface UserProfileRecordset {
  UserId: string;
  Email: string;
  PhoneNumber: string | null;
  IsEmailVerified: boolean;
  IsPhoneVerified: boolean;
  IsAgeVerified: boolean;
  IsIdentityVerified: boolean;
  AccountStatus: number | string;
  CreatedAt: Date;
  LastLoginAt: Date | null;
  FirstName: string;
  LastName: string;
  DisplayName: string | null;
  ProfileImageUrl: string | null;
  IsHostOnboarded: number;
  Roles: string;
  IsHost: boolean;
  IsStaff: boolean;
}

const GOOGLE_ISSUER = 'https://accounts.google.com';

/**
 * Servicio de autenticación con Google.
 * Valida el ID Token únicamente en el servidor con google-auth-library.
 * No confía en email, name ni sub enviados por el cliente.
 */
@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private readonly ACCESS_TOKEN_EXPIRATION = 900;
  private readonly REFRESH_TOKEN_DAYS = 90;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Login con Google: valida idToken, registra/obtiene usuario vía SP y retorna JWT del sistema.
   */
  async loginWithGoogle(dto: GoogleLoginDto): Promise<GoogleLoginResponse> {
    const { idToken } = dto;

    this.logger.log('Intento de login con Google');

    try {
      const payload = await this.validateGoogleIdToken(idToken);

      const providerUserId = payload.sub;
      const email = payload.email ?? '';
      const name = payload.name ?? '';
      const picture = payload.picture ?? null;

      const { userId, isNewUser } = await this.loginWithProvider(
        providerUserId,
        email,
        name,
        picture,
      );

      const user = await this.getUserLoginData(userId);
      const accessToken = this.generateAccessToken(userId, email, user.roles);
      const refreshToken = await this.createRefreshToken(userId);

      this.validateAccountStatus(user.accountStatus, email);

      this.logger.log(`Login Google exitoso para: ${email} (isNewUser: ${isNewUser})`);

      return {
        accessToken,
        refreshToken,
        expiresIn: this.ACCESS_TOKEN_EXPIRATION,
        user,
        isNewUser,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`Error en login Google: ${error.message}`);
      throw new InternalServerErrorException(
        'Error al procesar el login con Google. Intenta nuevamente.',
      );
    }
  }

  /**
   * Valida el idToken contra Google. Verifica issuer, audience y exp.
   * Extrae sub, email, name, picture del payload. No acepta datos del cliente.
   */
  async validateGoogleIdToken(idToken: string): Promise<GoogleTokenPayload> {
    const clientId = this.configService.get<string>('GOOGLE_WEB_CLIENT_ID');
    if (!clientId) {
      this.logger.error('GOOGLE_WEB_CLIENT_ID no configurado');
      throw new InternalServerErrorException('Configuración de Google no disponible');
    }

    const client = new OAuth2Client(clientId);

    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
      });
    } catch (err) {
      this.logger.warn(`Validación de idToken fallida: ${err.message}`);
      throw new UnauthorizedException('Token de Google inválido o expirado');
    }

    const payload = ticket.getPayload();
    if (!payload) {
      throw new UnauthorizedException('Token de Google inválido');
    }

    const iss = payload.iss;
    const aud = payload.aud;
    const exp = payload.exp;

    if (iss !== GOOGLE_ISSUER) {
      this.logger.warn(`Issuer no permitido: ${iss}`);
      throw new UnauthorizedException('Token de Google inválido');
    }

    if (aud !== clientId) {
      this.logger.warn(`Audience no coincide con GOOGLE_WEB_CLIENT_ID`);
      throw new UnauthorizedException('Token de Google inválido');
    }

    if (!exp || exp * 1000 < Date.now()) {
      throw new UnauthorizedException('Token de Google expirado');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      iss,
      aud: typeof aud === 'string' ? aud : Array.isArray(aud) ? aud[0] : '',
      exp,
    };
  }

  /**
   * Llama a security.xsp_login_with_provider.
   * @ProviderType = 1 (Google), datos desde el payload verificado del token.
   */
  private async loginWithProvider(
    providerUserId: string,
    email: string,
    name: string,
    picture: string | null,
  ): Promise<{ userId: string; isNewUser: boolean }> {
    const result = await this.databaseService.executeStoredProcedure(
      '[security].[xsp_login_with_provider]',
      [
        { name: 'ProviderType', type: sql.Int, value: 1 },
        { name: 'ProviderUserId', type: sql.NVarChar(255), value: providerUserId },
        { name: 'ProviderEmail', type: sql.NVarChar(255), value: email },
        { name: 'ProviderDisplayName', type: sql.NVarChar(500), value: name },
        {
          name: 'ProviderPhotoUrl',
          type: sql.NVarChar(2000),
          value: picture ?? '',
        },
      ],
      [
        { name: 'UserId', type: sql.UniqueIdentifier },
        { name: 'IsNewUser', type: sql.Bit },
        { name: 'ErrorMessage', type: sql.NVarChar(500) },
      ],
    );

    const { UserId, IsNewUser, ErrorMessage } = result.output;

    if (ErrorMessage) {
      this.logger.warn(`xsp_login_with_provider error: ${ErrorMessage}`);
      throw new UnauthorizedException(
        ErrorMessage || 'No se pudo iniciar sesión con Google',
      );
    }

    if (!UserId) {
      throw new UnauthorizedException('No se pudo obtener el usuario');
    }

    return {
      userId: UserId,
      isNewUser: Boolean(IsNewUser),
    };
  }

  private async getUserLoginData(userId: string): Promise<LoginUserData> {
    const result = await this.databaseService.executeStoredProcedure<UserProfileRecordset>(
      '[security].[xsp_get_user_profile]',
      [{ name: 'UserId', type: sql.UniqueIdentifier, value: userId }],
      [{ name: 'ErrorMessage', type: sql.NVarChar(500) }],
    );

    if (result.output.ErrorMessage) {
      this.logger.error(`Error al obtener perfil: ${result.output.ErrorMessage}`);
      throw new InternalServerErrorException('Error al obtener datos del usuario');
    }

    const row = result.recordset?.[0];
    if (!row) {
      throw new InternalServerErrorException('Usuario sin perfil');
    }

    const accountStatus =
      typeof row.AccountStatus === 'number'
        ? row.AccountStatus
        : this.parseAccountStatus(String(row.AccountStatus));

    const roles = row.Roles
      ? row.Roles.split(',').map((r) => r.trim().toLowerCase()).filter(Boolean)
      : ['guest'];

    return {
      userId: row.UserId,
      email: row.Email,
      phoneNumber: row.PhoneNumber ?? null,
      firstName: row.FirstName ?? '',
      lastName: row.LastName ?? '',
      displayName: row.DisplayName ?? null,
      profileImageUrl: row.ProfileImageUrl ?? null,
      roles,
      isEmailVerified: Boolean(row.IsEmailVerified),
      isPhoneVerified: Boolean(row.IsPhoneVerified),
      isAgeVerified: Boolean(row.IsAgeVerified),
      isIdentityVerified: Boolean(row.IsIdentityVerified),
      isHost: Boolean(row.IsHost),
      isHostOnboarded: row.IsHostOnboarded ?? 0,
      isStaff: Boolean(row.IsStaff),
      accountStatus,
      createdAt: row.CreatedAt,
      lastLoginAt: row.LastLoginAt ?? row.CreatedAt,
    };
  }

  private parseAccountStatus(status: string): number {
    const map: Record<string, number> = {
      active: 1,
      suspended: 2,
      deleted: 3,
      banned: 4,
    };
    return map[status?.toLowerCase()] ?? 1;
  }

  private validateAccountStatus(status: number, email: string): void {
    switch (status) {
      case 1:
        return;
      case 2:
        throw new ForbiddenException(
          'Tu cuenta ha sido suspendida. Contacta a soporte para más información.',
        );
      case 3:
        throw new ForbiddenException('Esta cuenta ha sido eliminada.');
      case 4:
        throw new ForbiddenException('Tu cuenta ha sido baneada permanentemente.');
      default:
        throw new ForbiddenException('Estado de cuenta no válido. Contacta a soporte.');
    }
  }

  private generateAccessToken(userId: string, email: string, roles: string[]): string {
    const payload: JwtPayload = { sub: userId, email, roles };
    return this.jwtService.sign(payload);
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_DAYS);

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

    if (result.output.ErrorMessage) {
      this.logger.error(`Error al crear refresh token: ${result.output.ErrorMessage}`);
      throw new InternalServerErrorException('Error al generar el token de sesión');
    }

    return token;
  }
}
