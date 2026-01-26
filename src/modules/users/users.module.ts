import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';

/**
 * Módulo de usuarios
 *
 * Gestiona el perfil del usuario autenticado:
 * - GET /users/me - Obtener perfil
 * - PATCH /users/me - Actualizar perfil
 *
 * Todos los endpoints requieren autenticación JWT
 */
@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
