import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para enviar el correo de verificación de anfitrión (panel admin).
 * El email incluye un botón que lleva a FRONTEND_URL/login.
 */
export class SendVerificationEmailDto {
  @ApiProperty({
    description: 'UserId del anfitrión al que se enviará el correo de verificación',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID('4', { message: 'userId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'userId es obligatorio' })
  userId: string;
}
