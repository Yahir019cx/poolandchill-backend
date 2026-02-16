import { IsUUID, IsIn, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePropertyStatusDto {
  @ApiProperty({
    description: 'UUID de la propiedad',
    example:
      '1C59D07C-E1DC-44BF-B35E-1D8B87489EBC"550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'El ID de la propiedad debe ser un UUID válido' })
  propertyId: string;

  @ApiProperty({
    description:
      'Nuevo estado de la propiedad (3=Activa, 4=Pausada, 5=Baneada)',
    example: 3,
  })
  @IsInt()
  @IsIn([3, 4, 5], {
    message: 'El estado debe ser 3, 4 o 5',
  })
  Op: number;
}
