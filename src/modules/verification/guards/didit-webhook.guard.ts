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

    const signatureV2 = request.headers['x-signature-v2'];
    const signatureSimple = request.headers['x-signature-simple'];
    const timestamp = request.headers['x-timestamp'];

    if ((!signatureV2 && !signatureSimple) || !timestamp) {
      this.logger.warn('Webhook sin firma o timestamp');
      throw new UnauthorizedException('Firma de webhook requerida');
    }

    const webhookSecret = this.configService.get<string>('DIDIT_WEBHOOK_SECRET');

    if (!webhookSecret) {
      this.logger.error('DIDIT_WEBHOOK_SECRET no configurado');
      throw new UnauthorizedException('Configuración de webhook incompleta');
    }

    // Verificar timestamp (no más de 5 minutos de antigüedad)
    const currentTime = Math.floor(Date.now() / 1000);
    const incomingTime = parseInt(timestamp, 10);

    if (Math.abs(currentTime - incomingTime) > 300) {
      this.logger.warn(`Webhook con timestamp fuera de rango: ${timestamp}`);
      throw new UnauthorizedException('Webhook expirado');
    }

    // Intentar verificar con X-Signature-V2 primero (recomendado por Didit)
    if (signatureV2) {
      try {
        if (this.verifySignatureV2(request.body, signatureV2, webhookSecret)) {
          return true;
        }
        this.logger.warn('Firma V2 no coincide');
      } catch (error) {
        this.logger.warn(`Error verificando firma V2: ${error.message}`);
      }
    }

    // Fallback: verificar con X-Signature-Simple
    if (signatureSimple) {
      try {
        if (this.verifySignatureSimple(request.body, signatureSimple, webhookSecret)) {
          return true;
        }
        this.logger.warn('Firma Simple no coincide');
      } catch (error) {
        this.logger.warn(`Error verificando firma Simple: ${error.message}`);
      }
    }

    this.logger.warn('Firma de webhook inválida');
    throw new UnauthorizedException('Firma de webhook inválida');
  }

  /**
   * Verifica X-Signature-V2 (recomendado por Didit)
   * Usa JSON con claves ordenadas recursivamente y floats procesados
   */
  private verifySignatureV2(body: any, signature: string, secret: string): boolean {
    const processedData = this.shortenFloats(body);
    const canonicalJson = JSON.stringify(this.sortKeys(processedData));
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(canonicalJson, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(signature, 'utf8'),
    );
  }

  /**
   * Verifica X-Signature-Simple (fallback)
   * Usa string canónico: "timestamp:session_id:status:webhook_type"
   */
  private verifySignatureSimple(body: any, signature: string, secret: string): boolean {
    const canonicalString = [
      body.timestamp || '',
      body.session_id || '',
      body.status || '',
      body.webhook_type || '',
    ].join(':');

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(canonicalString)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(signature, 'utf8'),
    );
  }

  private sortKeys(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortKeys(item));
    } else if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce((result, key) => {
          result[key] = this.sortKeys(obj[key]);
          return result;
        }, {} as Record<string, any>);
    }
    return obj;
  }

  private shortenFloats(data: any): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.shortenFloats(item));
    } else if (data !== null && typeof data === 'object') {
      return Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, this.shortenFloats(value)]),
      );
    } else if (typeof data === 'number' && !Number.isInteger(data) && data % 1 === 0) {
      return Math.trunc(data);
    }
    return data;
  }
}
