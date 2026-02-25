import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsOptional, IsString, IsIn, IsBoolean } from 'class-validator';

export class CancelBookingDto {
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
    enum: ['guest_request', 'no_show', 'force_majeure', 'host_request', 'admin_action'],
    default: 'guest_request',
  })
  @IsOptional()
  @IsString()
  @IsIn(['guest_request', 'no_show', 'force_majeure', 'host_request', 'admin_action'], {
    message: "cancellationReason debe ser 'guest_request', 'no_show', 'force_majeure', 'host_request' o 'admin_action'",
  })
  cancellationReason?: string;

  @ApiPropertyOptional({
    description: 'Aprobación de fuerza mayor (solo admin)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isForceMajeurApproved?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si el usuario es administrador',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}
