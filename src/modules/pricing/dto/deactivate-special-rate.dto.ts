import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeactivateSpecialRateDto {
  @ApiProperty({
    description: 'ID de la tarifa especial a desactivar',
    example: '0D3C1077-9189-4544-A51A-B4696D6B6799',
  })
  @IsUUID('4')
  idSpecialRate: string;
}
