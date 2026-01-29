import { Module } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { AuthModule } from '../auth/auth.module';

/**
 * Módulo de propiedades
 *
 * Gestiona el registro y administración de propiedades:
 * - POST /properties - Crear propiedad completa (wizard)
 * - GET /properties - Listar mis propiedades
 * - GET /properties/:id - Obtener propiedad
 * - PATCH /properties/:id/status - Pausar/Reactivar
 * - DELETE /properties/:id - Eliminar
 * - GET /properties/catalogs/amenities - Catálogo amenidades
 * - GET /properties/catalogs/states - Catálogo estados
 * - GET /properties/catalogs/cities/:stateId - Catálogo ciudades
 */
@Module({
  imports: [AuthModule],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
