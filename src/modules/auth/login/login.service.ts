import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';
import { LoginDto } from './dto/login.dto';
import { DatabaseService } from '../../../config/database.config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import {
  LoginResponse,
  LoginUserData,
  LoginSpUserData,
} from '../interfaces/login-response.interface';

/**
 * Servicio para manejar el login de usuarios
 * Implementa autenticación con JWT y Refresh Tokens
 */
@Injectable()
export class LoginService {
  private readonly logger = new Logger(LoginService.name);

  /** Duración del Access Token en segundos (15 minutos) */
  private readonly ACCESS_TOKEN_EXPIRATION = 900;

  /** Duración del Refresh Token en días */
  private readonly REFRESH_TOKEN_DAYS = 90;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Procesa el login de un usuario
   * 1. Obtiene el hash almacenado de la BD
   * 2. Compara con bcrypt.compare en NestJS
   * 3. Valida credenciales con el SP
   * 4. Genera Access Token (JWT) y Refresh Token (UUID)
   * 5. Guarda Refresh Token en BD
   * 6. Retorna tokens y datos del usuario
   */
  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const { email, password } = loginDto;

    this.logger.log(`Intento de login para: ${email}`);

    try {
      // 1. Obtener el hash almacenado de la BD
      const storedHash = await this.getStoredPasswordHash(email);

      if (!storedHash) {
        throw new UnauthorizedException('Email o contraseña incorrectos');
      }

      // 2. Comparar password con bcrypt
      const isPasswordValid = await bcrypt.compare(password, storedHash);

      if (!isPasswordValid) {
        // Llamar al SP con hash incorrecto para registrar intento fallido
        await this.validateCredentials(email, 'invalid_hash_attempt');
        throw new UnauthorizedException('Email o contraseña incorrectos');
      }

      // 3. Llamar al SP con el hash correcto (para registrar login exitoso y obtener datos)
      const userData = await this.validateCredentials(email, storedHash);

      // 4. Generar Access Token (JWT)
      const roles = this.parseRoles(userData.Roles);
      const accessToken = this.generateAccessToken(userData.UserId, userData.Email, roles);

      // 5. Generar y guardar Refresh Token
      const refreshToken = await this.createRefreshToken(userData.UserId);

      // 6. Preparar respuesta
      const userResponse = this.mapUserData(userData, roles);

      this.logger.log(`Login exitoso para: ${email}`);

      return {
        accessToken,
        refreshToken,
        expiresIn: this.ACCESS_TOKEN_EXPIRATION,
        user: userResponse,
      };
    } catch (error) {
      // Re-lanzar excepciones conocidas
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.logger.error(`Error en login para ${email}: ${error.message}`);
      throw new InternalServerErrorException('Error al procesar el login. Intenta nuevamente.');
    }
  }

  /**
   * Obtiene el hash de contraseña almacenado para un email usando SP
   */
  private async getStoredPasswordHash(email: string): Promise<string | null> {
    const result = await this.databaseService.executeStoredProcedure(
      '[security].[xsp_GetPasswordHashByEmail]',
      [
        { name: 'Email', type: sql.NVarChar(255), value: email },
      ],
      [
        { name: 'PasswordHash', type: sql.NVarChar(255) },
        { name: 'UserId', type: sql.UniqueIdentifier },
        { name: 'ErrorMessage', type: sql.NVarChar(500) },
      ],
    );

    return result.output.PasswordHash || null;
  }

  /**
   * Valida las credenciales llamando al SP xsp_LoginWithPassword
   */
  private async validateCredentials(email: string, password: string): Promise<LoginSpUserData> {
    const result = await this.databaseService.executeStoredProcedure<LoginSpUserData>(
      '[security].[xsp_LoginWithPassword]',
      [
        { name: 'Email', type: sql.NVarChar(255), value: email },
        { name: 'PasswordHash', type: sql.NVarChar(255), value: password },
      ],
      [
        { name: 'UserId', type: sql.UniqueIdentifier },
        { name: 'IsLocked', type: sql.Bit },
        { name: 'LockedUntil', type: sql.DateTime2 },
        { name: 'ErrorMessage', type: sql.NVarChar(500) },
      ],
    );

    const { IsLocked, LockedUntil, ErrorMessage } = result.output;

    // Verificar si la cuenta está bloqueada
    if (IsLocked) {
      const lockedUntilDate = LockedUntil ? new Date(LockedUntil) : null;
      const minutesRemaining = lockedUntilDate
        ? Math.ceil((lockedUntilDate.getTime() - Date.now()) / 60000)
        : 15;

      this.logger.warn(`Cuenta bloqueada para: ${email}`);
      throw new UnauthorizedException(
        `Cuenta bloqueada por múltiples intentos fallidos. Intenta nuevamente en ${minutesRemaining} minutos.`,
      );
    }

    // Verificar si hubo error (credenciales incorrectas, etc.)
    if (ErrorMessage) {
      this.logger.warn(`Error de login para ${email}: ${ErrorMessage}`);
      // Mensaje genérico para no revelar si el email existe
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    // Verificar que haya datos del usuario
    const userData = result.recordset?.[0];
    if (!userData) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    // Verificar el estado de la cuenta
    this.validateAccountStatus(userData.AccountStatus, email);

    return userData;
  }

  /**
   * Valida el estado de la cuenta del usuario
   */
  private validateAccountStatus(status: number, email: string): void {
    // AccountStatus: 1=Active, 2=Suspended, 3=Deleted, 4=Banned
    switch (status) {
      case 1:
        // Cuenta activa - OK
        return;
      case 2:
        this.logger.warn(`Cuenta suspendida: ${email}`);
        throw new ForbiddenException(
          'Tu cuenta ha sido suspendida. Contacta a soporte para más información.',
        );
      case 3:
        this.logger.warn(`Cuenta eliminada: ${email}`);
        throw new ForbiddenException(
          'Esta cuenta ha sido eliminada.',
        );
      case 4:
        this.logger.warn(`Cuenta baneada: ${email}`);
        throw new ForbiddenException(
          'Tu cuenta ha sido baneada permanentemente.',
        );
      default:
        this.logger.warn(`Estado de cuenta desconocido (${status}): ${email}`);
        throw new ForbiddenException(
          'Estado de cuenta no válido. Contacta a soporte.',
        );
    }
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
      return ['guest']; // Rol por defecto
    }

    return rolesString
      .split(',')
      .map((role) => role.trim().toLowerCase())
      .filter((role) => role.length > 0);
  }

  /**
   * Mapea los datos del SP al formato de respuesta
   */
  private mapUserData(spData: LoginSpUserData, roles: string[]): LoginUserData {
    return {
      userId: spData.UserId,
      email: spData.Email,
      phoneNumber: spData.PhoneNumber,
      firstName: spData.FirstName,
      lastName: spData.LastName,
      displayName: spData.DisplayName,
      profileImageUrl: spData.ProfileImageUrl,
      roles,
      isEmailVerified: spData.IsEmailVerified,
      isPhoneVerified: spData.IsPhoneVerified,
      isAgeVerified: spData.IsAgeVerified,
      isIdentityVerified: spData.IsIdentityVerified,
      isHost: spData.IsHost,
      isStaff: spData.IsStaff,
      accountStatus: spData.AccountStatus,
      createdAt: spData.CreatedAt,
      lastLoginAt: spData.LastLoginAt,
    };
  }
}
