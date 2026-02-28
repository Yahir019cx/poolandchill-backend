import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, ArrayMinSize } from 'class-validator';

export class BulkBetaInviteDto {
  @ApiProperty({
    description: 'Lista de correos electrónicos a los que se enviará la invitación',
    example: ['user1@gmail.com', 'user2@gmail.com'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEmail({}, { each: true })
  emails: string[];
}
