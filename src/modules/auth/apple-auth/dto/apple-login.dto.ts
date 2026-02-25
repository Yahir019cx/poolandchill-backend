import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO para login con Apple (Sign in with Apple).
 * El backend valida el identityToken server-side con las JWKS de Apple.
 * firstName y lastName solo están disponibles en el primer login del dispositivo.
 */
export class AppleLoginDto {
  @ApiProperty({
    example: 'eyJraWQiOiJBSURPUEsxIiwiYWxnIjoiUlMyNTYifQ...',
    description: 'Identity Token JWT de Apple (obtenido con ASAuthorizationAppleIDCredential.identityToken)',
  })
  @IsString({ message: 'identityToken debe ser un string' })
  @IsNotEmpty({ message: 'identityToken es obligatorio' })
  identityToken: string;

  @ApiPropertyOptional({
    example: 'Juan',
    description: 'Nombre del usuario. Solo disponible en el primer login con Apple desde el dispositivo.',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Pérez',
    description: 'Apellido del usuario. Solo disponible en el primer login con Apple desde el dispositivo.',
  })
  @IsOptional()
  @IsString()
  lastName?: string;
}
