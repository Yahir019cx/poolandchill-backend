import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeactivateSpecialRateDto {
  @ApiProperty({
    description: 'ID de la tarifa especial a desactivar',
    example: '0D3C1077-9189-4544-A51A-B4696D6B6799',
  })
  @IsUUID('4')
  idSpecialRate: string;

  @ApiPropertyOptional({
    description: 'ID de la propiedad (recomendado para invalidar caché del calendario tras desactivar)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID('4')
  propertyId?: string;
}
