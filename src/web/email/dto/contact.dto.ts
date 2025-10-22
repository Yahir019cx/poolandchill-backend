import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsIn,
  MinLength,
} from 'class-validator';

export class ContactDto {
  @ApiProperty({ example: 'Yahir Villalobos', description: 'Nombre completo del remitente' })
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'yahir@poolandchill.com.mx', description: 'Correo del remitente' })
  @IsNotEmpty()
  @IsEmail()
  correo: string;

  @ApiProperty({ example: '+52 477 123 4567', required: false })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({
    example: 'huésped',
    description: 'Tipo de usuario que envía el formulario',
    enum: ['huésped', 'anfitrión'],
  })
  @IsNotEmpty()
  @IsIn(['huésped', 'anfitrión'])
  rol: string;

  @ApiProperty({
    example: ['Cabaña', 'Alberca'],
    required: false,
    description: 'Tipos de espacio (solo si es anfitrión)',
  })
  @IsOptional()
  @IsArray()
  tipoEspacio?: string[];

  @ApiProperty({ example: 'Cabañas del Sol', required: false })
  @IsOptional()
  @IsString()
  nombreLugar?: string;

  @ApiProperty({ example: 'Av. Juárez #123, León, Gto.', required: false })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiProperty({
    example: 'Cabaña con alberca privada y asador.',
    required: false,
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({
    example: 'Me gustaría que la app tuviera más filtros por ubicación.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  mensaje?: string;
}
