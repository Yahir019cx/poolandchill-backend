import { IsString, MinLength, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectPropertyDto {
  @ApiProperty({
    description: 'UUID de la propiedad a rechazar',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'El ID de la propiedad debe ser un UUID válido' })
  propertyId: string;

  @ApiProperty({
    description: 'Motivo del rechazo',
    example: 'Las imágenes no corresponden a la propiedad descrita.',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres' })
  reason: string;
}
