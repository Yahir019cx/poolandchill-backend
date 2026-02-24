import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({
    description: 'ID de la propiedad (UUID)',
    example: 'CF49B657-E8C6-4818-BFCB-38D675935AEF',
  })
  @IsNotEmpty({ message: 'propertyId es requerido' })
  @IsUUID('4', { message: 'propertyId debe ser un UUID válido' })
  propertyId: string;

  @ApiPropertyOptional({
    description:
      'Fecha de reserva para propiedades de solo alberca (YYYY-MM-DD).',
    example: '2026-03-15',
  })
  @IsOptional()
  @IsDateString({}, { message: 'bookingDate debe tener formato YYYY-MM-DD' })
  bookingDate?: string;

  @ApiPropertyOptional({
    description:
      'Fecha de llegada para propiedades con cabaña o camping (YYYY-MM-DD).',
    example: '2026-03-15',
  })
  @IsOptional()
  @IsDateString({}, { message: 'checkInDate debe tener formato YYYY-MM-DD' })
  checkInDate?: string;

  @ApiPropertyOptional({
    description:
      'Fecha de salida para propiedades con cabaña o camping (YYYY-MM-DD).',
    example: '2026-03-17',
  })
  @IsOptional()
  @IsDateString({}, { message: 'checkOutDate debe tener formato YYYY-MM-DD' })
  checkOutDate?: string;

  @ApiPropertyOptional({
    description: 'Notas adicionales para el anfitrión',
    example: 'Llegaremos alrededor de las 6pm',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  guestNotes?: string;

  @ApiPropertyOptional({
    description: 'Indica si el huésped requiere factura fiscal (CFDI)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'requiresInvoice debe ser un valor booleano' })
  requiresInvoice?: boolean;
}
