import {
  IsUUID,
  IsIn,
  IsDateString,
  IsNumber,
  Min,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSpecialRateDto {
  @ApiProperty({
    description: 'ID de la propiedad',
    example: '0D3C1077-9189-4544-A51A-B4696D6B6799',
  })
  @IsUUID('4')
  idProperty: string;

  @ApiProperty({
    description: 'Tipo de propiedad',
    enum: ['pool', 'cabin', 'camping'],
    example: 'pool',
  })
  @IsIn(['pool', 'cabin', 'camping'], {
    message: 'propertyType debe ser pool, cabin o camping',
  })
  propertyType: 'pool' | 'cabin' | 'camping';

  @ApiProperty({
    description: 'Fecha de inicio (YYYY-MM-DD)',
    example: '2026-03-20',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Fecha de fin (YYYY-MM-DD)',
    example: '2026-03-27',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: 'Precio especial',
    example: 4500.5,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'El precio especial debe ser mayor a 0' })
  specialPrice: number;

  @ApiPropertyOptional({
    description: 'Motivo (ej. Semana Santa, Navidad)',
    maxLength: 200,
  })
  @IsOptional()
  @MaxLength(200)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Descripción adicional',
    maxLength: 500,
  })
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
