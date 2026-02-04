import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class DiditWebhookGuard implements CanActivate {
  private readonly logger = new Logger(DiditWebhookGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const signature = request.headers['x-signature'];
    const timestamp = request.headers['x-timestamp'];
    const rawBody = request.rawBody;

    if (!signature || !timestamp) {
      this.logger.warn('Webhook sin firma o timestamp');
      throw new UnauthorizedException('Firma de webhook requerida');
    }

    const webhookSecret = this.configService.get<string>('DIDIT_WEBHOOK_SECRET');

    if (!webhookSecret) {
      this.logger.error('DIDIT_WEBHOOK_SECRET no configurado');
      throw new UnauthorizedException('Configuración de webhook incompleta');
    }

    // Verificar timestamp (no más de 5 minutos de antigüedad)
    const timestampMs = parseInt(timestamp, 10) * 1000;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (Math.abs(now - timestampMs) > fiveMinutes) {
      this.logger.warn(`Webhook con timestamp fuera de rango: ${timestamp}`);
      throw new UnauthorizedException('Webhook expirado');
    }

    // Validar firma HMAC
    const payload = rawBody?.toString() || JSON.stringify(request.body);
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('hex');

    try {
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );

      if (!isValid) {
        this.logger.warn('Firma de webhook inválida');
        throw new UnauthorizedException('Firma de webhook inválida');
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Error validando firma: ${error.message}`);
      throw new UnauthorizedException('Error validando firma de webhook');
    }
  }
}
