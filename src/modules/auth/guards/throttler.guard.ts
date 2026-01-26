import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Guard de rate limiting personalizado
 * Usa la IP del cliente como identificador
 *
 * Configuración por endpoint:
 * - Login: 5 intentos / minuto (protección contra brute force)
 * - Register: 3 intentos / minuto (prevenir spam de cuentas)
 * - Refresh: 20 intentos / minuto (más permisivo, uso normal)
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  /**
   * Obtiene el identificador del cliente (IP)
   * Maneja proxies y load balancers
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Priorizar headers de proxy para obtener IP real
    const forwarded = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];

    if (forwarded) {
      // x-forwarded-for puede tener múltiples IPs, tomar la primera
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
    }

    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fallback a IP directa
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }
}
