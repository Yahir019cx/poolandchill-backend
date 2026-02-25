import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import * as sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../../config/database.config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import {
  AppleLoginResponse,
  LoginUserData,
} from '../interfaces/login-response.interface';
import { AppleLoginDto } from './dto/apple-login.dto';

/** Payload verificado del Identity Token de Apple (solo campos usados) */
interface AppleTokenPayload {
  sub: string;
  email?: string;
  email_verified?: boolean | string;
  is_private_email?: boolean | string;
  iss: string;
  aud: string;
  exp: number;
}

/** Recordset de [security].[xsp_get_user_profile] */
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

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = new URL('https://appleid.apple.com/auth/keys');

/**
 * Servicio de autenticación con Apple (Sign in with Apple).
 * Valida el Identity Token server-side usando las JWKS de Apple.
 * No confía en email ni sub enviados por el cliente.
 */
@Injectable()
export class AppleAuthService {
  private readonly logger = new Logger(AppleAuthService.name);
  private readonly ACCESS_TOKEN_EXPIRATION = 900;
  private readonly REFRESH_TOKEN_DAYS = 90;

  /** JWKS remoto de Apple — se cachea automáticamente por jose */
  private readonly appleJWKS = createRemoteJWKSet(APPLE_JWKS_URL);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Login con Apple: valida identityToken, registra/obtiene usuario vía SP y retorna JWT del sistema.
   */
  async loginWithApple(dto: AppleLoginDto): Promise<AppleLoginResponse> {
    const { identityToken, firstName, lastName } = dto;

    try {
      const payload = await this.validateAppleIdentityToken(identityToken);

      const providerUserId = payload.sub;
      const email = payload.email ?? '';
      // Construir nombre: Apple solo lo envía en el primer login desde el dispositivo
      const displayName = [firstName, lastName].filter(Boolean).join(' ').trim();

      const { userId, isNewUser } = await this.loginWithProvider(
        providerUserId,
        email,
        displayName,
        firstName,
        lastName,
      );

      const user = await this.getUserLoginData(userId);
      const accessToken = this.generateAccessToken(userId, email, user.roles);
      const refreshToken = await this.createRefreshToken(userId);

      this.validateAccountStatus(user.accountStatus, email);

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
      this.logger.error(`Error en login Apple: ${error.message}`);
      throw new InternalServerErrorException(
        'Error al procesar el login con Apple. Intenta nuevamente.',
      );
    }
  }

  /**
   * Valida el identityToken contra las JWKS de Apple.
   * Verifica issuer, audience y exp automáticamente.
   */
  async validateAppleIdentityToken(identityToken: string): Promise<AppleTokenPayload> {
    const bundleId = this.configService.get<string>('APPLE_BUNDLE_ID');
    if (!bundleId) {
      this.logger.error('APPLE_BUNDLE_ID no configurado');
      throw new InternalServerErrorException('Configuración de Apple no disponible');
    }

    let payload: AppleTokenPayload;
    try {
      const { payload: raw } = await jwtVerify(identityToken, this.appleJWKS, {
        issuer: APPLE_ISSUER,
        audience: bundleId,
      });
      payload = raw as unknown as AppleTokenPayload;
    } catch (err) {
      this.logger.warn(`Apple identity token inválido: ${err.message}`);
      throw new UnauthorizedException('Token de Apple inválido o expirado');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Token de Apple inválido');
    }

    return payload;
  }

  /**
   * Llama a security.xsp_login_with_provider.
   * @ProviderType = 2 (Apple)
   */
  private async loginWithProvider(
    providerUserId: string,
    email: string,
    displayName: string,
    firstName?: string,
    lastName?: string,
  ): Promise<{ userId: string; isNewUser: boolean }> {
    const result = await this.databaseService.executeStoredProcedure(
      '[security].[xsp_login_with_provider]',
      [
        { name: 'ProviderType', type: sql.Int, value: 2 },
        { name: 'ProviderUserId', type: sql.NVarChar(255), value: providerUserId },
        { name: 'ProviderEmail', type: sql.NVarChar(255), value: email },
        { name: 'ProviderDisplayName', type: sql.NVarChar(500), value: displayName || null },
        { name: 'ProviderPhotoUrl', type: sql.NVarChar(2000), value: '' },
        { name: 'FirstName', type: sql.NVarChar(100), value: firstName || null },
        { name: 'LastName', type: sql.NVarChar(100), value: lastName || null },
      ],
      [
        { name: 'UserId', type: sql.UniqueIdentifier },
        { name: 'IsNewUser', type: sql.Bit },
        { name: 'ErrorMessage', type: sql.NVarChar(500) },
      ],
    );

    const { UserId, IsNewUser, ErrorMessage } = result.output;

    if (ErrorMessage) {
      throw new UnauthorizedException(ErrorMessage || 'No se pudo iniciar sesión con Apple');
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
