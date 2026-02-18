import {
  IsUUID,
  IsIn,
  IsDateString,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOwnerDateBlockDto {
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
    example: '2026-03-22',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: 'Motivo del bloqueo',
    enum: ['maintenance', 'personal_use', 'renovation', 'weather', 'other'],
    example: 'maintenance',
  })
  @IsIn(
    ['maintenance', 'personal_use', 'renovation', 'weather', 'other'],
    {
      message:
        'reason debe ser: maintenance, personal_use, renovation, weather, other',
    },
  )
  reason:
    | 'maintenance'
    | 'personal_use'
    | 'renovation'
    | 'weather'
    | 'other';

  @ApiPropertyOptional({
    description: 'Notas adicionales',
    maxLength: 500,
  })
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
