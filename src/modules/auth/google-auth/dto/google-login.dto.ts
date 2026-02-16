import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para login con Google.
 * El backend valida el idToken server-side; no se aceptan email, name ni sub del cliente.
 */
export class GoogleLoginDto {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'ID Token de Google (obtenido en el frontend con signInWithCredential / getIdToken)',
  })
  @IsString({ message: 'idToken debe ser un string' })
  @IsNotEmpty({ message: 'idToken es obligatorio' })
  idToken: string;
}
