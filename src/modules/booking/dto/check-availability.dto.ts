import { IsNotEmpty, IsUUID, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckAvailabilityDto {
  @ApiProperty({
    description: 'ID de la propiedad (UUID)',
    example: 'CF49B657-E8C6-4818-BFCB-38D675935AEF',
  })
  @IsNotEmpty({ message: 'propertyId es requerido' })
  @IsUUID('4', { message: 'propertyId debe ser un UUID válido' })
  propertyId: string;

  @ApiProperty({
    description: 'Fecha de check-in o fecha de reserva (YYYY-MM-DD)',
    example: '2026-03-15',
  })
  @IsNotEmpty({ message: 'checkInDate es requerido' })
  @IsDateString({}, { message: 'checkInDate debe tener formato YYYY-MM-DD' })
  checkInDate: string;

  @ApiPropertyOptional({
    description:
      'Fecha de check-out (YYYY-MM-DD). Si no se envía, se verifica solo 1 día.',
    example: '2026-03-17',
  })
  @IsOptional()
  @IsDateString({}, { message: 'checkOutDate debe tener formato YYYY-MM-DD' })
  checkOutDate?: string;
}
