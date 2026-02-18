import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({
    description: 'Nombre del invitado',
    example: 'Juan Pérez',
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nombre: string;

  @ApiProperty({
    description: 'Número de teléfono',
    example: '5512345678',
    maxLength: 20,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  numero: string;

  @ApiProperty({
    description: 'Correo electrónico',
    example: 'juan@example.com',
    maxLength: 100,
  })
  @IsEmail()
  @MaxLength(100)
  correo: string;

  @ApiProperty({
    description: 'Número de invitados',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  invitados: number;
}
