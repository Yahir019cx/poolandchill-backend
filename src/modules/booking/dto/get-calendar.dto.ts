import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetCalendarDto {
  @ApiProperty({
    description: 'ID de la propiedad (UUID)',
    example: 'CF49B657-E8C6-4818-BFCB-38D675935AEF',
  })
  @IsNotEmpty({ message: 'propertyId es requerido' })
  @IsUUID('4', { message: 'propertyId debe ser un UUID válido' })
  propertyId: string;
}
