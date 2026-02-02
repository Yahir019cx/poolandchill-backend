import { IsOptional, IsBoolean, IsInt, IsNumber, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchPropertiesDto {
  @ApiPropertyOptional({ description: 'Filtrar por alberca', example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasPool?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por cabaña', example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasCabin?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por camping', example: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasCamping?: boolean;

  @ApiPropertyOptional({ description: 'ID del estado', example: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  stateId?: number;

  @ApiPropertyOptional({ description: 'ID de la ciudad', example: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  cityId?: number;

  @ApiPropertyOptional({ description: 'Precio mínimo', example: 500 })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Precio máximo', example: 5000 })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Buscar por nombre', example: 'Rancho' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'IDs de amenidades separados por coma', example: '1,5,12' })
  @IsOptional()
  @IsString()
  amenities?: string;

  @ApiPropertyOptional({
    description: 'Ordenar por',
    example: 'newest',
    enum: ['price_asc', 'price_desc', 'rating', 'newest']
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Número de página', example: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Tamaño de página', example: 20, default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  pageSize?: number;
}
