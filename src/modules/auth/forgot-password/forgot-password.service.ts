import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../../config/database.config';
import { ZohoMailService } from '../../../web/email/zoho-mail.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { forgotPasswordTemplate } from '../../../web/email/templates/forgot-password.template';
import { encryptPayload, decryptPayload } from '../../../common/utils/encryption.util';

/**
 * Payload que se encripta y viaja en la URL del email
 */
interface ResetTokenPayload {
  /** Token UUID almacenado en la BD (campo ResetToken en XINT_UserPasswords) */
  token: string;
  /** Email del usuario (para referencia en logs) */
  email: string;
  /** Timestamp de expiración (30 minutos) */
  exp: number;
}

/**
 * Servicio para manejar la recuperación de contraseña
 *
 * Tabla: [security].[XINT_UserPasswords]
 * Campos usados: ResetToken, ResetTokenExpires, ResetTokenUsed
 *
 * Flujo:
 * 1. Usuario solicita reset → se genera token UUID, se guarda en XINT_UserPasswords, se encripta y se envía por email
 * 2. Usuario hace clic en el enlace → frontend envía el token encriptado + nueva contraseña
 * 3. Backend desencripta, hashea nueva contraseña con bcrypt, llama a xsp_reset_password
 * 4. El SP valida token en BD, actualiza PasswordHash/PasswordSalt y marca token como usado
 */
@Injectable()
export class ForgotPasswordService {
  private readonly logger = new Logger(ForgotPasswordService.name);

  /** Duración del token de reset en minutos */
  private readonly RESET_TOKEN_EXPIRATION_MINUTES = 30;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly zohoMailService: ZohoMailService,
  ) {}

  // ══════════════════════════════════════════════════
  // FORGOT PASSWORD - Solicitar reset
  // ══════════════════════════════════════════════════

  /**
   * Procesa la solicitud de recuperación de contraseña
   * 1. Genera token UUID
   * 2. Lo guarda en XINT_UserPasswords (SP xsp_create_password_reset_token)
   * 3. Encripta el payload con ENCRYPTION_KEY
   * 4. Envía email con enlace: FRONTEND_URL/forgot-password?token={encrypted}
   *
   * IMPORTANTE: Siempre retorna éxito para no revelar si el email existe
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ success: boolean; message: string }> {
    const { email } = dto;

    this.logger.log(`Solicitud de recuperación de contraseña para: ${email}`);

    try {
      // 1. Generar token UUID
      const resetToken = uuidv4();

      // 2. Calcular expiración (30 minutos)
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setMinutes(tokenExpiresAt.getMinutes() + this.RESET_TOKEN_EXPIRATION_MINUTES);

      // 3. Guardar en BD → UPDATE XINT_UserPasswords SET ResetToken, ResetTokenExpires, ResetTokenUsed = 0
      const result = await this.createPasswordResetToken(email, resetToken, tokenExpiresAt);

      // Si el SP encontró el usuario, enviar email
      if (result.found && result.firstName) {
        // 4. Encriptar payload para la URL
        const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY', '');
        const payload: ResetTokenPayload = {
          token: resetToken,
          email,
          exp: tokenExpiresAt.getTime(),
        };
        const encryptedToken = encryptPayload(payload, encryptionKey);

        // 5. Construir URL y enviar email
        const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
        const resetUrl = `${frontendUrl}/forgot-password?token=${encryptedToken}`;

        await this.sendResetEmail(email, result.firstName, resetUrl);

        this.logger.log(`Email de recuperación enviado a: ${email}`);
      } else {
        // Email no existe, pero NO revelamos eso al usuario
        this.logger.log(`Email no encontrado para reset: ${email} (respuesta genérica enviada)`);
      }
    } catch (error) {
      // Logueamos el error pero NO lo exponemos al usuario
      this.logger.error(`Error en forgot-password para ${email}: ${error.message}`);
    }

    // SIEMPRE retornamos el mismo mensaje (seguridad: no revelar si el email existe)
    return {
      success: true,
      message: 'Si el email está registrado, recibirás un correo con las instrucciones para restablecer tu contraseña.',
    };
  }

  // ══════════════════════════════════════════════════
  // RESET PASSWORD - Restablecer contraseña
  // ══════════════════════════════════════════════════

  /**
   * Restablece la contraseña del usuario
   * 1. Desencripta el token del email
   * 2. Valida expiración del payload (primera capa)
   * 3. Hashea la nueva contraseña con bcrypt
   * 4. Llama a xsp_reset_password que valida token en BD y actualiza contraseña
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
    const { token: encryptedToken, newPassword } = dto;

    this.logger.log('Procesando restablecimiento de contraseña');

    // 1. Desencriptar el token
    let payload: ResetTokenPayload;
    try {
      const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY', '');
      payload = decryptPayload<ResetTokenPayload>(encryptedToken, encryptionKey);
    } catch {
      this.logger.warn('Token de reset inválido o corrupto');
      throw new BadRequestException('El enlace de recuperación es inválido. Solicita uno nuevo.');
    }

    // 2. Validar expiración del payload (doble validación: payload + BD)
    if (Date.now() > payload.exp) {
      this.logger.warn(`Token de reset expirado para: ${payload.email}`);
      throw new BadRequestException('El enlace de recuperación ha expirado. Solicita uno nuevo.');
    }

    // 3. Hashear la nueva contraseña con bcrypt (igual que en el registro)
    const bcryptRounds = parseInt(this.configService.get<string>('BCRYPT_ROUNDS', '12'), 10);
    const salt = await bcrypt.genSalt(bcryptRounds);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // 4. Validar token en BD y actualizar contraseña → xsp_reset_password
    try {
      await this.executePasswordReset(payload.token, passwordHash, salt);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error al restablecer contraseña: ${error.message}`);
      throw new InternalServerErrorException('Error al restablecer la contraseña. Intenta nuevamente.');
    }

    this.logger.log(`Contraseña restablecida exitosamente para: ${payload.email}`);

    return {
      success: true,
      message: 'Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión.',
    };
  }

  // ══════════════════════════════════════════════════
  // MÉTODOS PRIVADOS
  // ══════════════════════════════════════════════════

  /**
   * Crea un token de reset en la BD
   * Actualiza XINT_UserPasswords: ResetToken, ResetTokenExpires, ResetTokenUsed = 0
   *
   * SP: [security].[xsp_create_password_reset_token]
   * - Recibe: @Email, @ResetToken, @ResetTokenExpires
   * - Retorna OUTPUT: @Found (bit), @FirstName (nvarchar), @ErrorMessage (nvarchar)
   *
   * Lógica del SP:
   *   1. JOIN Users + UserPasswords por email para encontrar el UserId
   *   2. Si no existe → @Found = 0
   *   3. Si existe → UPDATE XINT_UserPasswords SET ResetToken, ResetTokenExpires, ResetTokenUsed = 0
   *   4. Retornar @Found = 1, @FirstName del usuario
   */
  private async createPasswordResetToken(
    email: string,
    resetToken: string,
    expiresAt: Date,
  ): Promise<{ found: boolean; firstName: string | null }> {
    const result = await this.databaseService.executeStoredProcedure(
      '[security].[xsp_create_password_reset_token]',
      [
        { name: 'Email', type: sql.NVarChar(255), value: email },
        { name: 'ResetToken', type: sql.NVarChar(255), value: resetToken },
        { name: 'ResetTokenExpires', type: sql.DateTime2, value: expiresAt },
      ],
      [
        { name: 'Found', type: sql.Bit },
        { name: 'FirstName', type: sql.NVarChar(100) },
        { name: 'ErrorMessage', type: sql.NVarChar(500) },
      ],
    );

    const { Found, FirstName, ErrorMessage } = result.output;

    if (ErrorMessage) {
      this.logger.error(`Error del SP xsp_create_password_reset_token: ${ErrorMessage}`);
      throw new InternalServerErrorException('Error al procesar la solicitud');
    }

    return {
      found: !!Found,
      firstName: FirstName || null,
    };
  }

  /**
   * Ejecuta el reset de contraseña en la BD
   * Usa el SP existente: [security].[xsp_reset_password]
   *
   * El SP valida en XINT_UserPasswords:
   *   1. Busca usuario por ResetToken
   *   2. Valida que ResetTokenUsed = 0
   *   3. Valida que ResetTokenExpires >= GETUTCDATE()
   *   4. Actualiza PasswordHash, PasswordSalt, PreviousPasswordHash
   *   5. Limpia ResetToken, ResetTokenExpires, marca ResetTokenUsed = 1
   *   6. Resetea FailedLoginAttempts y LockedUntil
   *
   * @param resetToken - Token UUID original (NO encriptado)
   * @param passwordHash - Hash bcrypt de la nueva contraseña
   * @param passwordSalt - Salt bcrypt
   */
  private async executePasswordReset(
    resetToken: string,
    passwordHash: string,
    passwordSalt: string,
  ): Promise<void> {
    const result = await this.databaseService.executeStoredProcedure(
      '[security].[xsp_reset_password]',
      [
        { name: 'ResetToken', type: sql.NVarChar(255), value: resetToken },
        { name: 'NewPasswordHash', type: sql.NVarChar(255), value: passwordHash },
        { name: 'NewPasswordSalt', type: sql.NVarChar(255), value: passwordSalt },
      ],
      [
        { name: 'ErrorMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ErrorMessage } = result.output;

    if (ErrorMessage) {
      const errorLower = ErrorMessage.toLowerCase();

      if (errorLower.includes('expirado') || errorLower.includes('expired')) {
        throw new BadRequestException('El enlace de recuperación ha expirado. Solicita uno nuevo.');
      }

      if (
        errorLower.includes('inválido') ||
        errorLower.includes('invalid') ||
        errorLower.includes('no encontrado') ||
        errorLower.includes('not found') ||
        errorLower.includes('usado') ||
        errorLower.includes('used')
      ) {
        throw new BadRequestException('El enlace de recuperación es inválido o ya fue utilizado. Solicita uno nuevo.');
      }

      this.logger.error(`Error del SP xsp_reset_password: ${ErrorMessage}`);
      throw new InternalServerErrorException('Error al restablecer la contraseña');
    }
  }

  /**
   * Envía el email de recuperación de contraseña
   */
  private async sendResetEmail(email: string, firstName: string, resetUrl: string): Promise<void> {
    const htmlContent = forgotPasswordTemplate(firstName, resetUrl);

    try {
      await this.zohoMailService.sendMail(
        email,
        'Restablece tu contraseña en Pool & Chill',
        htmlContent,
      );
    } catch (error) {
      this.logger.error(`Error al enviar email de reset: ${error.message}`);
      throw new InternalServerErrorException('Error al enviar el email de recuperación');
    }
  }
}
