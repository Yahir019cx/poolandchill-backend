import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, ArrayMinSize, IsString, MinLength } from 'class-validator';

export class SendAdminEmailDto {
  @ApiProperty({
    description: 'Asunto del email',
    example: 'Actualización importante para hosts',
  })
  @IsString()
  @MinLength(3)
  subject: string;

  @ApiProperty({
    description: 'Contenido del mensaje que recibirán los hosts',
    example: 'Estimado host, te informamos que a partir del próximo mes...',
  })
  @IsString()
  @MinLength(10)
  message: string;

  @ApiProperty({
    description: 'Lista de emails de los hosts destinatarios',
    example: ['host1@gmail.com', 'host2@gmail.com'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEmail({}, { each: true })
  hostEmails: string[];
}
