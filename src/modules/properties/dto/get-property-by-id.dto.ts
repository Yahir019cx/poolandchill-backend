import { IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetPropertyByIdDto {
  @ApiProperty({
    description: 'UUID de la propiedad',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'El ID de la propiedad debe ser un UUID válido' })
  propertyId: string;

  @ApiPropertyOptional({
    description: 'UUID del dueño (opcional). Si se envía, solo se devuelve la propiedad si pertenece a este dueño.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID del dueño debe ser un UUID válido' })
  idOwner?: string;
}
