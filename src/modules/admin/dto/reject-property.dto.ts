import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectPropertyDto {
  @ApiProperty({
    description: 'Motivo del rechazo',
    example: 'Las imágenes no corresponden a la propiedad descrita.',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres' })
  reason: string;
}
