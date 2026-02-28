import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';

/**
 * Paginación para listado de reservas (load more / scroll infinito).
 * El front pide página 1, luego 2, 3… y concatena en cliente.
 */
export class ListBookingsDto {
  @ApiPropertyOptional({
    description: 'Número de página (1-based). Por defecto 1.',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'page debe ser al menos 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Cantidad de reservas por página. Por defecto 20. Máximo 100.',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'pageSize debe ser al menos 1' })
  @Max(100, { message: 'pageSize no puede exceder 100' })
  pageSize?: number = 20;
}
