import {
  Injectable,
  Logger,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { ZohoMailService } from '../../../web/email/zoho-mail.service';
import { DatabaseService } from '../../../config/database.config';
import {
  RegisterResponse,
  PendingRegistration,
} from '../email-verification/interfaces/pending-registration.interface';

/**
 * Servicio para manejar el registro de usuarios
 * Implementa el flujo de registro con verificación de email
 */
@Injectable()
export class RegisterService {
  private readonly logger = new Logger(RegisterService.name);

  /** Paleta de colores corporativos para el template de email */
  private readonly colors = {
    primary: '#3CA2A2',
    secondary: '#215A6D',
    green: '#8EBDB6',
    light: '#DFECE6',
    dark: '#063940',
    white: '#FFFFFF',
    gray: '#F8F9FA',
    textDark: '#333333',
    textLight: '#666666',
  };

  /** URL del logo de Pool & Chill */
  private readonly logoUrl =
    'https://firebasestorage.googleapis.com/v0/b/poolandchillapp.firebasestorage.app/o/Brand%2FlogoLT.png?alt=media&token=85af76c9-5a06-467c-a7da-729025ba753a';

  constructor(
    private readonly configService: ConfigService,
    private readonly zohoMailService: ZohoMailService,
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Procesa el registro de un nuevo usuario
   * 1. Hashea la contraseña
   * 2. Genera token de verificación
   * 3. Guarda en la tabla de registros pendientes
   * 4. Envía email de verificación
   */
  async register(registerDto: RegisterDto): Promise<RegisterResponse> {
    const { email, firstName, lastName, password, dateOfBirth, gender } = registerDto;

    this.logger.log(`Iniciando registro para: ${email}`);

    // 1. Hashear la contraseña con bcrypt
    const bcryptRounds = parseInt(this.configService.get<string>('BCRYPT_ROUNDS', '12'), 10);
    const salt = await bcrypt.genSalt(bcryptRounds);
    const passwordHash = await bcrypt.hash(password, salt);

    // 2. Generar token UUID v4 único
    const verificationToken = uuidv4();

    // 3. Calcular fecha de expiración (24 horas)
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24);

    // 4. Guardar en la base de datos
    const pendingRegistration = await this.createPendingRegistration({
      email,
      firstName,
      lastName,
      passwordHash,
      passwordSalt: salt,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      verificationToken,
      tokenExpiresAt,
    });

    // 5. Enviar email de verificación
    await this.sendVerificationEmail(email, firstName, verificationToken);

    this.logger.log(`Registro pendiente creado para: ${email}, ID: ${pendingRegistration.registrationId}`);

    return {
      success: true,
      message: 'Registro iniciado. Revisa tu email para verificar tu cuenta.',
    };
  }

  /**
   * Crea un registro pendiente en la base de datos
   * Llama al SP xsp_CreatePendingRegistration
   */
  private async createPendingRegistration(data: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    passwordSalt: string;
    dateOfBirth: string | null;
    gender: number | null;
    verificationToken: string;
    tokenExpiresAt: Date;
  }): Promise<PendingRegistration> {
    try {
      const result = await this.databaseService.executeStoredProcedure(
        '[security].[xsp_CreatePendingRegistration]',
        [
          { name: 'Email', type: sql.NVarChar(255), value: data.email },
          { name: 'FirstName', type: sql.NVarChar(100), value: data.firstName },
          { name: 'LastName', type: sql.NVarChar(100), value: data.lastName },
          { name: 'PasswordHash', type: sql.NVarChar(255), value: data.passwordHash },
          { name: 'PasswordSalt', type: sql.NVarChar(255), value: data.passwordSalt },
          { name: 'DateOfBirth', type: sql.Date, value: data.dateOfBirth },
          { name: 'Gender', type: sql.TinyInt, value: data.gender },
          { name: 'VerificationToken', type: sql.NVarChar(255), value: data.verificationToken },
          { name: 'TokenExpiresAt', type: sql.DateTime2, value: data.tokenExpiresAt },
        ],
        [
          { name: 'RegistrationId', type: sql.UniqueIdentifier },
          { name: 'ErrorMessage', type: sql.NVarChar(500) },
        ],
      );

      const { RegistrationId: registrationId, ErrorMessage: errorMessage } = result.output;

      // Verificar si hubo error en el SP
      if (errorMessage) {
        this.logger.error(`Error del SP: ${errorMessage}`);

        if (
          errorMessage.toLowerCase().includes('ya existe') ||
          errorMessage.toLowerCase().includes('already exists') ||
          errorMessage.toLowerCase().includes('duplicado') ||
          errorMessage.toLowerCase().includes('ya está registrado')
        ) {
          throw new ConflictException('El email ya está registrado. Por favor, inicia sesión o usa otro email.');
        }

        throw new InternalServerErrorException(errorMessage);
      }

      const recordset = result.recordset?.[0];

      return {
        registrationId: registrationId || recordset?.RegistrationId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        verificationToken: data.verificationToken,
        tokenExpiresAt: data.tokenExpiresAt,
        createdAt: recordset?.CreatedAt || new Date(),
      };
    } catch (error) {
      this.logger.error(`Error al crear registro pendiente: ${error.message}`);

      if (error instanceof ConflictException || error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException('Error al procesar el registro. Intenta nuevamente.');
    }
  }

  /**
   * Envía el email de verificación al usuario
   */
  private async sendVerificationEmail(email: string, firstName: string, token: string): Promise<void> {
    const backendUrl = this.configService.get<string>('BACKEND_URL', 'http://localhost:3000');
    const verificationUrl = `${backendUrl}/auth/verify-email?token=${token}`;

    const htmlContent = this.getVerificationEmailTemplate(firstName, verificationUrl);

    try {
      await this.zohoMailService.sendMail(
        email,
        'Verifica tu cuenta en Pool & Chill',
        htmlContent,
      );
      this.logger.log(`Email de verificación enviado a: ${email}`);
    } catch (error) {
      this.logger.error(`Error al enviar email de verificación: ${error.message}`);
      throw new InternalServerErrorException('Error al enviar el email de verificación. Intenta nuevamente.');
    }
  }

  /**
   * Genera el template HTML para el email de verificación
   */
  private getVerificationEmailTemplate(firstName: string, verificationUrl: string): string {
    return `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Verifica tu cuenta - Pool & Chill</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: ${this.colors.gray}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${this.colors.gray};">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: ${this.colors.white}; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-radius: 16px; overflow: hidden;">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, ${this.colors.dark} 0%, ${this.colors.secondary} 100%); padding: 40px 30px;">
                    <img src="${this.logoUrl}" alt="Pool & Chill" width="150" style="display: block; max-width: 150px; height: auto; margin: 0 auto;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 30px 30px 20px 30px;">
                    <span style="display: inline-block; background: ${this.colors.primary}; color: ${this.colors.white}; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Verificación de Email</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <h1 style="margin: 0 0 20px 0; color: ${this.colors.textDark}; font-size: 24px; font-weight: 700; text-align: center;">¡Hola ${firstName}!</h1>
                    <p style="margin: 0 0 25px 0; color: ${this.colors.textDark}; font-size: 16px; line-height: 1.6; text-align: center;">
                      Gracias por registrarte en <strong>Pool & Chill</strong>. Para completar tu registro y activar tu cuenta, verifica tu dirección de email haciendo clic en el siguiente botón:
                    </p>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" style="padding: 10px 0 30px 0;">
                          <a href="${verificationUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, ${this.colors.primary} 0%, ${this.colors.secondary} 100%); color: ${this.colors.white}; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(60, 162, 162, 0.4);">
                            Verificar mi cuenta
                          </a>
                        </td>
                      </tr>
                    </table>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="background-color: ${this.colors.light}; padding: 16px 20px; border-radius: 8px; border-left: 4px solid ${this.colors.primary};">
                          <p style="margin: 0; color: ${this.colors.textDark}; font-size: 14px; line-height: 1.5;">
                            <strong>⏰ Importante:</strong> Este enlace es válido por <strong>24 horas</strong>. Si no verificas tu cuenta antes de que expire, tendrás que registrarte nuevamente.
                          </p>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 25px 0 0 0; color: ${this.colors.textLight}; font-size: 13px; line-height: 1.5; text-align: center;">
                      Si el botón no funciona, copia y pega este enlace en tu navegador:
                    </p>
                    <p style="margin: 10px 0 0 0; color: ${this.colors.primary}; font-size: 12px; word-break: break-all; text-align: center;">
                      <a href="${verificationUrl}" style="color: ${this.colors.primary}; text-decoration: underline;">${verificationUrl}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 30px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="border-top: 1px solid #E0E0E0;"></td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 25px 40px;">
                    <p style="margin: 0; color: ${this.colors.textLight}; font-size: 13px; line-height: 1.5; text-align: center;">
                      Si no solicitaste esta cuenta, puedes ignorar este mensaje. Tu información está segura y no se creará ninguna cuenta sin tu verificación.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, ${this.colors.dark} 0%, ${this.colors.secondary} 100%); padding: 35px 30px;">
                    <img src="${this.logoUrl}" alt="Pool & Chill" width="100" style="display: block; max-width: 100px; height: auto; margin: 0 auto 15px auto; opacity: 0.9;" />
                    <p style="margin: 0 0 10px 0; color: ${this.colors.primary}; font-size: 15px; font-weight: 500; font-style: italic;">Relájate, disfruta y reserva</p>
                    <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 500;">© ${new Date().getFullYear()} Pool & Chill. Todos los derechos reservados.</p>
                    <p style="margin: 0; color: ${this.colors.primary}; font-size: 11px; font-weight: 500;">Sistema de notificaciones automáticas</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }
}
