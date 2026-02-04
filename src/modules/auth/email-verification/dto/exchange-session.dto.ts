import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para intercambiar un session token por tokens reales
 */
export class ExchangeSessionDto {
  @ApiProperty({
    description: 'Session token temporal obtenido después de verificar el email',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty({ message: 'El session token es requerido' })
  sessionToken: string;
}
