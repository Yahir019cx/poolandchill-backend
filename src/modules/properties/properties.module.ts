import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../../web/email/email.module';

import { PropertiesCreateController } from './create/properties-create.controller';
import { PropertiesCreateService } from './create/properties-create.service';

import { PropertiesSearchController } from './search/properties-search.controller';
import { PropertiesSearchService } from './search/properties-search.service';

import { PropertiesFavoritesController, PropertiesFavoritesService } from './favorites';

import { PropertiesReadController } from './read/properties-read.controller';
import { PropertiesReadService } from './read/properties-read.service';

import { PropertiesStatusController } from './status/properties-status.controller';
import { PropertiesStatusService } from './status/properties-status.service';

import { PropertiesUpdateController } from './update/properties-update.controller';
import { PropertiesUpdateService } from './update/properties-update.service';

import { CatalogsController } from './catalogs/catalogs.controller';
import { CatalogsService } from './catalogs/catalogs.service';

/**
 * Módulo de propiedades (separado por responsabilidad).
 *
 * - create: POST /properties - Crear propiedad (wizard)
 * - search: GET /properties/search - Buscar propiedades
 * - favorites: GET/POST/DELETE /properties/favorites - Favoritos
 * - read: GET /properties/my, POST /properties/by-id - Consultas owner y detalle
 * - status: POST /properties/owner/status, POST /properties/owner/delete
 * - catalogs: GET /catalogs/amenities|states|cities
 */
@Module({
  imports: [AuthModule, EmailModule],
  controllers: [
    PropertiesCreateController,
    PropertiesSearchController,
    PropertiesFavoritesController,
    PropertiesReadController,
    PropertiesStatusController,
    PropertiesUpdateController,
    CatalogsController,
  ],
  providers: [
    PropertiesCreateService,
    PropertiesSearchService,
    PropertiesFavoritesService,
    PropertiesReadService,
    PropertiesStatusService,
    PropertiesUpdateService,
    CatalogsService,
  ],
  exports: [
    PropertiesCreateService,
    PropertiesSearchService,
    PropertiesFavoritesService,
    PropertiesReadService,
    PropertiesStatusService,
    PropertiesUpdateService,
    CatalogsService,
  ],
})
export class PropertiesModule {}
