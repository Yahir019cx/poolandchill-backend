import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
  Matches,
} from 'class-validator';

/**
 * DTO para el registro de nuevos usuarios
 * Valida los datos de entrada antes de procesar el registro
 */
export class RegisterDto {
  @ApiProperty({
    example: 'juan@example.com',
    description: 'Email del usuario (será verificado)',
  })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @ApiProperty({
    example: 'Juan',
    description: 'Nombre del usuario',
  })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  firstName: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Apellido del usuario',
  })
  @IsString({ message: 'El apellido debe ser texto' })
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  lastName: string;

  @ApiProperty({
    example: 'Password123',
    description: 'Contraseña: mínimo 8 caracteres, debe incluir mayúsculas, minúsculas y números',
    minLength: 8,
  })
  @IsString({ message: 'La contraseña debe ser texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'La contraseña debe incluir al menos una mayúscula, una minúscula y un número',
  })
  password: string;

  @ApiProperty({
    example: '1990-03-15',
    description: 'Fecha de nacimiento en formato YYYY-MM-DD (opcional)',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Debe ser una fecha válida en formato YYYY-MM-DD' })
  dateOfBirth?: string;

  @ApiProperty({
    example: 1,
    description: 'Género: 1=Masculino, 2=Femenino, 3=Otro, 4=Prefiero no decir (opcional)',
    required: false,
    enum: [1, 2, 3, 4],
  })
  @IsOptional()
  @IsInt({ message: 'El género debe ser un número entero' })
  @Min(1, { message: 'El género debe estar entre 1 y 4' })
  @Max(4, { message: 'El género debe estar entre 1 y 4' })
  gender?: number;
}
