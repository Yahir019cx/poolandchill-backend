import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';
import * as crypto from 'crypto';
import { DatabaseService } from '../../config/database.config';
import { DiditWebhookDto } from './dto';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly diditApiUrl = 'https://verification.didit.me/v2';

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Inicia una sesión de verificación en Didit
   */
  async startVerification(userId: string) {
    this.logger.log(`Iniciando verificación para usuario: ${userId}`);

    const apiKey = this.configService.get<string>('DIDIT_API_KEY');
    const workflowId = this.configService.get<string>('DIDIT_WORKFLOW_ID');
    const callbackUrl = this.configService.get<string>('DIDIT_CALLBACK_URL');

    if (!apiKey || !workflowId) {
      throw new InternalServerErrorException('Configuración de Didit incompleta');
    }

    try {
      // Verificar si el usuario ya tiene una sesión pendiente o ya está verificado
      const userStatus = await this.getUserVerificationStatus(userId);

      if (userStatus.isVerified) {
        return {
          success: true,
          message: 'Usuario ya está verificado',
          data: { alreadyVerified: true },
        };
      }

      // Si tiene una sesión pendiente, retornar esa URL
      if (userStatus.pendingSessionId && userStatus.verificationUrl) {
        return {
          success: true,
          message: 'Ya existe una sesión de verificación pendiente',
          data: {
            sessionId: userStatus.pendingSessionId,
            verificationUrl: userStatus.verificationUrl,
          },
        };
      }

      // Crear nueva sesión en Didit
      const response = await fetch(`${this.diditApiUrl}/session/`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          workflow_id: workflowId,
          callback: callbackUrl,
          vendor_data: userId, // Nuestro userId para identificar en el webhook
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`Error de Didit: ${response.status} - ${errorBody}`);
        this.logger.error(`Request details - URL: ${this.diditApiUrl}/session/`);
        this.logger.error(`Request details - Headers: ${JSON.stringify({ 'x-api-key': apiKey.substring(0, 10) + '...', workflowId, callbackUrl })}`);
        throw new BadRequestException(`Error al crear sesión de verificación: ${response.status} - ${errorBody}`);
      }

      const diditResponse = await response.json();

      // Guardar session_id en la BD
      await this.saveVerificationSession(
        userId,
        diditResponse.session_id,
        diditResponse.verification_url,
      );

      this.logger.log(`Sesión de verificación creada: ${diditResponse.session_id}`);

      return {
        success: true,
        message: 'Sesión de verificación creada',
        data: {
          sessionId: diditResponse.session_id,
          verificationUrl: diditResponse.verification_url,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error iniciando verificación: ${error.message}`);
      throw new InternalServerErrorException('Error al iniciar verificación');
    }
  }

  /**
   * Procesa el webhook de Didit
   */
  async processWebhook(payload: DiditWebhookDto) {
    this.logger.log(`Webhook recibido - Session: ${payload.session_id}, Status: ${payload.status}`);

    const { session_id, status, vendor_data, decision } = payload;

    // Determinar si está verificado
    const isVerified = status === 'Approved';
    const isDeclined = status === 'Declined';

    if (!isVerified && !isDeclined) {
      // Estados intermedios (In Progress, In Review, etc.) - solo log
      this.logger.log(`Estado intermedio recibido: ${status}`);
      return { success: true, message: 'Webhook procesado (estado intermedio)' };
    }

    try {
      // Actualizar en la BD usando el session_id
      const result = await this.databaseService.executeStoredProcedure(
        '[security].[xsp_UpdateIdentityVerification]',
        [
          { name: 'DiditSessionID', type: sql.VarChar(100), value: session_id },
          { name: 'IsVerified', type: sql.Bit, value: isVerified },
          { name: 'VerificationStatus', type: sql.VarChar(50), value: status },
          {
            name: 'VerificationData',
            type: sql.NVarChar(sql.MAX),
            value: decision ? JSON.stringify(decision) : null,
          },
        ],
        [
          { name: 'ResultCode', type: sql.Int },
          { name: 'ResultMessage', type: sql.NVarChar(500) },
        ],
      );

      const { ResultCode, ResultMessage } = result.output;

      if (ResultCode !== 0) {
        this.logger.error(`Error actualizando verificación: ${ResultMessage}`);
        throw new BadRequestException(ResultMessage);
      }

      this.logger.log(`Verificación actualizada - Session: ${session_id}, Verified: ${isVerified}`);

      return {
        success: true,
        message: 'Webhook procesado correctamente',
      };
    } catch (error) {
      this.logger.error(`Error procesando webhook: ${error.message}`);
      throw new InternalServerErrorException('Error procesando webhook');
    }
  }

  /**
   * Valida la firma del webhook de Didit
   */
  validateWebhookSignature(
    payload: string,
    signature: string,
    timestamp: string,
  ): boolean {
    const webhookSecret = this.configService.get<string>('DIDIT_WEBHOOK_SECRET');

    if (!webhookSecret) {
      this.logger.error('DIDIT_WEBHOOK_SECRET no configurado');
      return false;
    }

    // Verificar que el timestamp no sea muy viejo (5 minutos)
    const timestampMs = parseInt(timestamp, 10) * 1000;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (Math.abs(now - timestampMs) > fiveMinutes) {
      this.logger.warn('Webhook con timestamp fuera de rango');
      return false;
    }

    // Crear firma esperada
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * Obtiene el estado de verificación del usuario
   */
  async getVerificationStatus(userId: string) {
    const status = await this.getUserVerificationStatus(userId);

    return {
      success: true,
      data: {
        isVerified: status.isVerified,
        verificationStatus: status.verificationStatus,
        hasPendingSession: !!status.pendingSessionId,
      },
    };
  }

  // ══════════════════════════════════════════════════
  // MÉTODOS PRIVADOS
  // ══════════════════════════════════════════════════

  /**
   * Obtiene el estado de verificación del usuario desde la BD
   */
  private async getUserVerificationStatus(userId: string): Promise<{
    isVerified: boolean;
    verificationStatus: string | null;
    pendingSessionId: string | null;
    verificationUrl: string | null;
  }> {
    const result = await this.databaseService.executeStoredProcedure(
      '[security].[xsp_GetUserVerificationStatus]',
      [
        { name: 'UserId', type: sql.UniqueIdentifier, value: userId },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;

    if (ResultCode !== 0) {
      throw new BadRequestException(ResultMessage || 'Usuario no encontrado');
    }

    const user = result.recordset[0];

    return {
      isVerified: user?.IsIdentityVerified || false,
      verificationStatus: user?.IdentityVerificationStatus || null,
      pendingSessionId: user?.DiditSessionID || null,
      verificationUrl: user?.DiditVerificationUrl || null,
    };
  }

  /**
   * Guarda la sesión de verificación en la BD
   */
  private async saveVerificationSession(
    userId: string,
    sessionId: string,
    verificationUrl: string,
  ): Promise<void> {
    const result = await this.databaseService.executeStoredProcedure(
      '[security].[xsp_SaveVerificationSession]',
      [
        { name: 'UserId', type: sql.UniqueIdentifier, value: userId },
        { name: 'DiditSessionID', type: sql.VarChar(100), value: sessionId },
        { name: 'DiditVerificationUrl', type: sql.VarChar(500), value: verificationUrl },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;

    if (ResultCode !== 0) {
      throw new BadRequestException(ResultMessage || 'Error al guardar sesión de verificación');
    }
  }
}
