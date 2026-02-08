import { Module } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { CatalogsController } from './catalogs.controller';
import { PropertiesService } from './properties.service';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../../web/email/email.module';

/**
 * Módulo de propiedades
 *
 * Gestiona el registro y administración de propiedades:
 * - POST /properties - Crear propiedad completa (wizard)
 * - GET /properties/my - Listar propiedades del dueño
 * - GET /properties/search - Buscar propiedades
 * - PATCH /properties/:id/status - Pausar/Reactivar
 * - DELETE /properties/:id - Eliminar
 *
 * Catálogos (en /catalogs):
 * - GET /catalogs/amenities - Catálogo amenidades
 * - GET /catalogs/states - Catálogo estados
 * - GET /catalogs/cities/:stateId - Catálogo ciudades
 */
@Module({
  imports: [AuthModule, EmailModule],
  controllers: [PropertiesController, CatalogsController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
