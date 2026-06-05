import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  Length,
  Matches,
  IsOptional,
} from 'class-validator';

export class SetupConnectAccountDto {
  @ApiProperty({ example: 'Juan', description: 'Nombre del host' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'García López', description: 'Apellidos del host' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '1990-05-15', description: 'Fecha de nacimiento (YYYY-MM-DD)' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ example: '5512345678', description: 'Teléfono (10 dígitos MX)' })
  @IsString()
  @Matches(/^\d{10}$/, { message: 'El teléfono debe tener exactamente 10 dígitos' })
  phone: string;

  @ApiProperty({ example: 'GALO900515AB1', description: 'RFC del host (12 o 13 caracteres)' })
  @IsString()
  @Length(12, 13, { message: 'El RFC debe tener 12 o 13 caracteres' })
  rfc: string;

  @ApiProperty({ example: '123456789012345678', description: 'CLABE interbancaria (18 dígitos)' })
  @IsString()
  @Matches(/^\d{18}$/, { message: 'La CLABE debe tener exactamente 18 dígitos' })
  clabe: string;

  @ApiProperty({ example: 'Av. Insurgentes Sur', description: 'Calle del domicilio fiscal' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ example: '1235', description: 'Número exterior' })
  @IsString()
  @IsNotEmpty()
  exteriorNumber: string;

  @ApiPropertyOptional({ example: 'A', description: 'Número interior (opcional)' })
  @IsString()
  @IsOptional()
  interiorNumber?: string | null;

  @ApiProperty({ example: 'Del Valle', description: 'Colonia' })
  @IsString()
  @IsNotEmpty()
  neighborhood: string;

  @ApiProperty({ example: '03100', description: 'Código postal (5 dígitos)' })
  @IsString()
  @Matches(/^\d{5}$/, { message: 'El código postal debe tener exactamente 5 dígitos' })
  zipCode: string;

  @ApiProperty({ example: 'Ciudad de México', description: 'Nombre del estado' })
  @IsString()
  @IsNotEmpty()
  stateName: string;

  @ApiProperty({ example: 'Benito Juárez', description: 'Nombre de la ciudad o alcaldía' })
  @IsString()
  @IsNotEmpty()
  cityName: string;
}
