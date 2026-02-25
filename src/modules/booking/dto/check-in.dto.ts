import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsString, Length } from 'class-validator';

export class CheckInDto {
  @ApiProperty({
    description: 'Código de la reserva',
    example: 'PLH-2026-000005',
  })
  @IsNotEmpty({ message: 'bookingCode es requerido' })
  @IsString()
  bookingCode: string;

  @ApiProperty({
    description: 'ID de la reserva (UUID)',
    example: 'CF49B657-E8C6-4818-BFCB-38D675935AEF',
  })
  @IsNotEmpty({ message: 'bookingId es requerido' })
  @IsUUID('4', { message: 'bookingId debe ser un UUID válido' })
  bookingId: string;

  @ApiProperty({
    description: 'Hash SHA256 del QR escaneado (64 caracteres hex)',
    example: 'A1B2C3D4E5F6...',
  })
  @IsNotEmpty({ message: 'qrHash es requerido' })
  @IsString()
  @Length(64, 64, { message: 'qrHash debe ser un hash SHA256 de 64 caracteres' })
  qrHash: string;
}
