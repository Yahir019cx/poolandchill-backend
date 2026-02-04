import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApprovePropertyDto {
  @ApiProperty({
    description: 'UUID de la propiedad a aprobar',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'El ID de la propiedad debe ser un UUID válido' })
  propertyId: string;
}
