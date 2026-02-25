import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsString, IsIn, IsOptional, MaxLength } from 'class-validator';

export class CheckOutDto {
  @ApiProperty({
    description: 'ID de la reserva (UUID)',
    example: 'CF49B657-E8C6-4818-BFCB-38D675935AEF',
  })
  @IsNotEmpty({ message: 'bookingId es requerido' })
  @IsUUID('4', { message: 'bookingId debe ser un UUID válido' })
  bookingId: string;

  @ApiProperty({
    description: "Estado de la propiedad al momento del check-out",
    example: 'good',
    enum: ['good', 'damaged'],
  })
  @IsNotEmpty({ message: 'propertyCondition es requerido' })
  @IsString()
  @IsIn(['good', 'damaged'], { message: "propertyCondition debe ser 'good' o 'damaged'" })
  propertyCondition: 'good' | 'damaged';

  @ApiPropertyOptional({
    description: 'Notas del host sobre la estancia o daños',
    example: 'Todo en orden, propiedad limpia.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  hostNotes?: string;
}
