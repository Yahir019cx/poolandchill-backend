import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PropertiesSearchService } from './properties-search.service';
import { SearchPropertiesDto } from '../dto';

@ApiTags('Properties')
@Controller('properties')
export class PropertiesSearchController {
  constructor(private readonly searchService: PropertiesSearchService) {}

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar propiedades',
    description: `
      Busca propiedades con filtros. Endpoint público.
      Si no se envían filtros, retorna todas las propiedades activas paginadas.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de propiedades',
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
