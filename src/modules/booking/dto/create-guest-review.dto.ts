import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsString,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export class CreateGuestReviewDto {
  @ApiProperty({
    description: 'ID de la reserva (UUID) que se va a calificar',
    example: 'CF49B657-E8C6-4818-BFCB-38D675935AEF',
  })
  @IsNotEmpty({ message: 'bookingId es requerido' })
  @IsUUID('4', { message: 'bookingId debe ser un UUID válido' })
  bookingId: string;

  @ApiProperty({
    description: 'Rating general del huésped (1.0 - 5.0)',
    example: 4.5,
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty({ message: 'rating es requerido' })
  @IsNumber({}, { message: 'rating debe ser numérico' })
  @Min(1, { message: 'rating mínimo es 1.0' })
  @Max(5, { message: 'rating máximo es 5.0' })
  rating: number;

  @ApiProperty({
    description: 'Limpieza del huésped (1.0 - 5.0)',
    example: 4.5,
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty({ message: 'cleanlinessRating es requerido' })
  @IsNumber({}, { message: 'cleanlinessRating debe ser numérico' })
  @Min(1, { message: 'cleanlinessRating mínimo es 1.0' })
  @Max(5, { message: 'cleanlinessRating máximo es 5.0' })
  cleanlinessRating: number;

  @ApiProperty({
    description: 'Comunicación del huésped (1.0 - 5.0)',
    example: 4.5,
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty({ message: 'communicationRating es requerido' })
  @IsNumber({}, { message: 'communicationRating debe ser numérico' })
  @Min(1, { message: 'communicationRating mínimo es 1.0' })
  @Max(5, { message: 'communicationRating máximo es 5.0' })
  communicationRating: number;

  @ApiProperty({
    description: 'Respeto a las reglas de la propiedad (1.0 - 5.0)',
    example: 5.0,
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty({ message: 'respectRulesRating es requerido' })
  @IsNumber({}, { message: 'respectRulesRating debe ser numérico' })
  @Min(1, { message: 'respectRulesRating mínimo es 1.0' })
  @Max(5, { message: 'respectRulesRating máximo es 5.0' })
  respectRulesRating: number;

  @ApiPropertyOptional({
    description: 'Comentario opcional del host sobre el huésped',
    example: 'Muy buen huésped, dejó todo limpio y se comunicó muy bien.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'comment no puede exceder 1000 caracteres' })
  comment?: string;

  @ApiProperty({
    description: 'Si el host volvería a recibir a este huésped',
    example: true,
  })
  @IsNotEmpty({ message: 'wouldHostAgain es requerido' })
  @IsBoolean({ message: 'wouldHostAgain debe ser booleano' })
  wouldHostAgain: boolean;
}

