import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * DTO para actualizar el perfil del usuario
 * Todos los campos son opcionales - solo se actualizan los que se envían
 *
 * Campos editables:
 * - displayName: Nombre a mostrar (debe contener partes del nombre real)
 * - bio: Biografía del usuario
 * - profileImageUrl: URL de imagen en Firebase Storage
 * - phoneNumber: Número de teléfono
 * - location: Ubicación del usuario
 */
export class UpdateProfileDto {
  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre a mostrar. Debe contener partes de tu nombre real (FirstName o LastName)',
    required: false,
    minLength: 2,
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'El nombre a mostrar debe ser texto' })
  @MinLength(2, { message: 'El nombre a mostrar debe tener al menos 2 caracteres' })
  @MaxLength(200, { message: 'El nombre a mostrar no puede exceder 200 caracteres' })
  displayName?: string;

  @ApiProperty({
    example: 'Amante de las albercas y el relax. Buscando nuevas experiencias.',
    description: 'Biografía del usuario',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'La biografía debe ser texto' })
  @MaxLength(500, { message: 'La biografía no puede exceder 500 caracteres' })
  bio?: string;

  @ApiProperty({
    example: 'https://firebasestorage.googleapis.com/v0/b/poolandchillapp.firebasestorage.app/o/users%2Fprofile.jpg',
    description: 'URL de la imagen de perfil (debe ser de Firebase Storage)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La URL de imagen debe ser texto' })
  @Matches(/^https:\/\/firebasestorage\.googleapis\.com\//, {
    message: 'La URL de imagen debe ser de Firebase Storage',
  })
  profileImageUrl?: string;

  @ApiProperty({
    example: '5512345678',
    description: 'Número de teléfono del usuario (mínimo 10 dígitos, se agregará + automáticamente si no viene)',
    required: false,
    minLength: 10,
  })
  @IsOptional()
  @IsString({ message: 'El número de teléfono debe ser texto' })
  @MinLength(10, { message: 'El número de teléfono debe tener al menos 10 caracteres' })
  phoneNumber?: string;

  @ApiProperty({
    example: 'Ciudad de México, México',
    description: 'Ubicación del usuario',
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'La ubicación debe ser texto' })
  @MaxLength(200, { message: 'La ubicación no puede exceder 200 caracteres' })
  location?: string;
}
