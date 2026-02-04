import { IsInt, IsIn, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para cambiar estado de propiedad
 * Solo permite: 3 = Active, 4 = Paused
 */
export class ChangeStatusDto {
  @ApiProperty({
    description: 'UUID de la propiedad',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'El ID de la propiedad debe ser un UUID válido' })
  propertyId: string;

  @ApiProperty({
    description: 'Nuevo estado: 3 = Active, 4 = Paused',
    example: 4,
    enum: [3, 4],
  })
  @IsInt({ message: 'El estado debe ser un número entero' })
  @IsIn([3, 4], { message: 'El estado debe ser 3 (Active) o 4 (Paused)' })
  status: number;
}
