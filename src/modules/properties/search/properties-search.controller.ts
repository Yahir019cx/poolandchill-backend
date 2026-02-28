import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PropertiesSearchService } from './properties-search.service';
import { SearchPropertiesDto } from '../dto';

@ApiTags('Properties · Búsqueda')
@Controller('properties')
export class PropertiesSearchController {
  constructor(private readonly searchService: PropertiesSearchService) {}

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar propiedades (paginado)',
    description: `
      Busca propiedades con filtros. Endpoint público.
      Si no se envían filtros, retorna todas las propiedades activas paginadas.

      **Load more / scroll infinito:** envía \`page\` y \`pageSize\` por query.
      Primera carga: \`?page=1&pageSize=20\`. Al cargar más: \`?page=2&pageSize=20\`.
      Concatena \`data.properties\` y usa \`data.hasMore\` para saber si hay más.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de propiedades con paginación',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            totalCount: { type: 'number', example: 100 },
            page: { type: 'number', example: 1 },
            pageSize: { type: 'number', example: 20 },
            hasMore: { type: 'boolean', example: true },
            properties: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  })
  async search(@Query() dto: SearchPropertiesDto) {
    return this.searchService.searchProperties(dto);
  }
}
