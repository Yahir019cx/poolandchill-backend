import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard para proteger rutas con autenticación JWT
 * Usa la estrategia JWT configurada en jwt.strategy.ts
 *
 * Uso en controllers:
 * @UseGuards(JwtAuthGuard)
 * @Get('protected-route')
 * async protectedRoute(@Request() req) {
 *   const user = req.user; // { userId, email, roles }
 * }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Maneja errores de autenticación con mensajes claros
   */
  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    info: any,
  ): TUser {
    // Si hay un error o no hay usuario, lanzar excepción apropiada
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expirado');
      }

      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Token inválido');
      }

      if (info?.name === 'NotBeforeError') {
        throw new UnauthorizedException('Token no válido todavía');
      }

      throw err || new UnauthorizedException('No autorizado');
    }

    return user;
  }
}
