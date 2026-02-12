import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * DTO para solicitar recuperación de contraseña
 * Solo requiere el email del usuario
 */
export class ForgotPasswordDto {
  @ApiProperty({
    example: 'juan@example.com',
    description: 'Email de la cuenta a recuperar',
  })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;
}
