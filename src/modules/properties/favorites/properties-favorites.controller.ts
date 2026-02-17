import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PropertiesFavoritesService } from './properties-favorites.service';
import { AddFavoriteDto } from '../dto';

@ApiTags('Properties')
@Controller('properties/favorites')
export class PropertiesFavoritesController {
  constructor(private readonly favoritesService: PropertiesFavoritesService) {}

  @Get('ids')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'IDs de favoritos',
    description: 'Lista solo los ID de propiedades favoritas (para pintar el corazón en home).',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de IDs',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            propertyIds: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getFavoriteIds(@Request() req: any) {
    const userId = req.user.userId;
    return this.favoritesService.getUserFavoriteIds(userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar favoritos',
    description: 'Lista las propiedades favoritas del usuario (misma forma que search para la card).',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de propiedades favoritas',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            properties: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  propertyId: { type: 'string', format: 'uuid' },
                  propertyName: { type: 'string' },
                  hasPool: { type: 'boolean' },
                  hasCabin: { type: 'boolean' },
                  hasCamping: { type: 'boolean' },
                  location: { type: 'string' },
                  priceFrom: { type: 'number' },
                  images: { type: 'array' },
                  rating: { type: 'string' },
                  reviewCount: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getFavorites(@Request() req: any) {
    const userId = req.user.userId;
    return this.favoritesService.getUserFavorites(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Agregar a favoritos',
    description: 'Agrega una propiedad a favoritos. Toggle: si ya está, devuelve error (el cliente puede llamar a DELETE).',
  })
  @ApiResponse({ status: 200, description: 'Agregado a favoritos' })
  @ApiResponse({ status: 400, description: 'Propiedad no existe, no publicada o ya en favoritos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async addFavorite(@Request() req: any, @Body() dto: AddFavoriteDto) {
    const userId = req.user.userId;
    return this.favoritesService.addFavorite(userId, dto.propertyId);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Quitar de favoritos',
    description: 'Quita una propiedad de favoritos. Body JSON: { "propertyId": "uuid" }.',
  })
  @ApiResponse({ status: 200, description: 'Eliminado de favoritos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async removeFavorite(@Request() req: any, @Body() dto: AddFavoriteDto) {
    const userId = req.user.userId;
    return this.favoritesService.removeFavorite(userId, dto.propertyId);
  }
}
