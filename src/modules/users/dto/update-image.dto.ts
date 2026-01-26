import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl, Matches } from 'class-validator';

/**
 * DTO para actualizar la imagen de perfil
 * Solo acepta URLs de Firebase Storage
 */
export class UpdateImageDto {
  @ApiProperty({
    example: 'https://firebasestorage.googleapis.com/v0/b/poolandchillapp.firebasestorage.app/o/profiles%2Fuser123%2Fphoto.jpg?alt=media',
    description: 'URL de la imagen en Firebase Storage',
  })
  @IsNotEmpty({ message: 'La URL de la imagen es obligatoria' })
  @IsString({ message: 'La URL debe ser texto' })
  @IsUrl({}, { message: 'Debe ser una URL válida' })
  @Matches(/^https:\/\/firebasestorage\.googleapis\.com\//, {
    message: 'Solo se permiten imágenes de Firebase Storage',
  })
  profileImageUrl: string;
}
