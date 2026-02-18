import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * DTO para crear cuenta Stripe Connect Express y obtener link de onboarding.
 */
export class CreateConnectAccountDto {
  @ApiProperty({
    description: 'ID del usuario (host) que vinculará su cuenta Stripe',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'UserId debe ser un UUID v4 válido' })
  @IsNotEmpty()
  userId: string;
}
