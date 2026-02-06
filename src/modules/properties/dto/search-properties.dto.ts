import { IsOptional, IsBoolean, IsInt, IsNumber, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchPropertiesDto {
  @ApiPropertyOptional({ description: 'Filtrar propiedades con alberca (true = solo con alberca)' })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  hasPool?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar propiedades con cabaña (true = solo con cabaña)' })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  hasCabin?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar propiedades con camping (true = solo con camping)' })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  hasCamping?: boolean;

  @ApiPropertyOptional({ description: 'ID del estado' })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  @IsInt()
  @Min(1)
  stateId?: number;

  @ApiPropertyOptional({ description: 'ID de la ciudad' })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  @IsInt()
  @Min(1)
  cityId?: number;

  @ApiPropertyOptional({ description: 'Precio mínimo' })
  @IsOptional()
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Precio máximo' })
  @IsOptional()
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Buscar por nombre' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'IDs de amenidades separados por coma' })
  @IsOptional()
  @IsString()
  amenities?: string;

  @ApiPropertyOptional({
    description: 'Ordenar por',
    enum: ['price_asc', 'price_desc', 'rating', 'newest'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Número de página', default: 1 })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Tamaño de página', default: 20 })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  @IsInt()
  @Min(1)
  pageSize?: number;
}
