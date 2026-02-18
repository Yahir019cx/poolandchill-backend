import { IsUUID, IsIn, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteOwnerDateBlockDto {
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
    description: 'Fecha de inicio del rango (YYYY-MM-DD)',
    example: '2026-03-20',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Fecha de fin del rango (YYYY-MM-DD)',
    example: '2026-03-22',
  })
  @IsDateString()
  endDate: string;
}
