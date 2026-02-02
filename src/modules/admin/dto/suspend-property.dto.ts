import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SuspendPropertyDto {
  @ApiProperty({
    description: 'Motivo de la suspensión',
    example: 'Múltiples reportes de usuarios por información falsa.',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres' })
  reason: string;
}
