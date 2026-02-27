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
} from 'class-validator';

export class CreateHostReviewDto {
  @ApiProperty({
    description: 'ID de la reserva (UUID) que se va a calificar',
    example: 'CF49B657-E8C6-4818-BFCB-38D675935AEF',
  })
  @IsNotEmpty({ message: 'bookingId es requerido' })
  @IsUUID('4', { message: 'bookingId debe ser un UUID válido' })
  bookingId: string;

  @ApiProperty({
    description: 'Rating general del host (1.0 - 5.0)',
    example: 4.5,
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty({ message: 'overallRating es requerido' })
  @IsNumber({}, { message: 'overallRating debe ser numérico' })
  @Min(1, { message: 'overallRating mínimo es 1.0' })
  @Max(5, { message: 'overallRating máximo es 5.0' })
  overallRating: number;

  @ApiProperty({
    description: 'Comunicación con el host (1.0 - 5.0)',
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
    description: 'Limpieza relacionada al host (1.0 - 5.0)',
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
    description: 'Precisión del anuncio / host (1.0 - 5.0)',
    example: 4.5,
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty({ message: 'accuracyRating es requerido' })
  @IsNumber({}, { message: 'accuracyRating debe ser numérico' })
  @Min(1, { message: 'accuracyRating mínimo es 1.0' })
  @Max(5, { message: 'accuracyRating máximo es 5.0' })
  accuracyRating: number;

  @ApiProperty({
    description: 'Experiencia de check-in con el host (1.0 - 5.0)',
    example: 4.5,
    minimum: 1,
    maximum: 5,
  })
  @IsNotEmpty({ message: 'checkInRating es requerido' })
  @IsNumber({}, { message: 'checkInRating debe ser numérico' })
  @Min(1, { message: 'checkInRating mínimo es 1.0' })
  @Max(5, { message: 'checkInRating máximo es 5.0' })
  checkInRating: number;

  @ApiPropertyOptional({
    description: 'Comentario opcional del huésped sobre el host',
    example: 'El host fue muy atento y la comunicación fue excelente.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'comment no puede exceder 2000 caracteres' })
  comment?: string;
}

