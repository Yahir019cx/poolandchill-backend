import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsOptional, IsString, IsIn } from 'class-validator';

export class CalculateRefundDto {
  @ApiProperty({
    description: 'ID de la reserva (UUID)',
    example: 'CF49B657-E8C6-4818-BFCB-38D675935AEF',
  })
  @IsNotEmpty({ message: 'bookingId es requerido' })
  @IsUUID('4', { message: 'bookingId debe ser un UUID válido' })
  bookingId: string;

  @ApiPropertyOptional({
    description: 'Razón de la cancelación',
    example: 'guest_request',
    enum: ['guest_request', 'no_show', 'force_majeure'],
    default: 'guest_request',
  })
  @IsOptional()
  @IsString()
  @IsIn(['guest_request', 'no_show', 'force_majeure'], {
    message: "cancellationReason debe ser 'guest_request', 'no_show' o 'force_majeure'",
  })
  cancellationReason?: string;
}
