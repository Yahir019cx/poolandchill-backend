import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * DTO para la solicitud de refresh token
 */
export class RefreshDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Refresh token UUID v4',
  })
  @IsNotEmpty({ message: 'El refresh token es obligatorio' })
  @IsUUID('4', { message: 'El refresh token debe ser un UUID válido' })
  refreshToken: string;
}
