import { IsString, MinLength, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SuspendPropertyDto {
  @ApiProperty({
    description: 'UUID de la propiedad a suspender',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'El ID de la propiedad debe ser un UUID válido' })
  propertyId: string;

  @ApiProperty({
    description: 'Motivo de la suspensión',
    example: 'Múltiples reportes de usuarios por información falsa.',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres' })
  reason: string;
}
