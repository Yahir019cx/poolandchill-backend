import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PropertiesService } from './properties.service';

@ApiTags('Catalogs')
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get('amenities')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener catálogo de amenidades',
    description: `
      Retorna las amenidades disponibles, opcionalmente filtradas por categoría.
      Soporta múltiples categorías en una sola petición separadas por coma.

      **Ejemplos:**
      - GET /catalogs/amenities (todas)
      - GET /catalogs/amenities?category=pool
      - GET /catalogs/amenities?category=cabin,pool
      - GET /catalogs/amenities?category=pool,cabin,camping
    `,
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Categorías separadas por coma. Valores: pool, cabin, camping',
    example: 'pool,cabin',
  })
  async getAmenities(@Query('category') category?: string) {
    return this.propertiesService.getAmenities(category);
  }

  @Get('states')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener catálogo de estados',
    description: 'Retorna la lista de estados disponibles.',
  })
  async getStates() {
    return this.propertiesService.getStates();
  }

  @Get('cities/:stateId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener ciudades por estado',
    description: 'Retorna las ciudades de un estado específico.',
  })
  @ApiParam({ name: 'stateId', type: Number, description: 'ID del estado' })
  async getCities(@Param('stateId', ParseIntPipe) stateId: number) {
    return this.propertiesService.getCities(stateId);
  }
}
