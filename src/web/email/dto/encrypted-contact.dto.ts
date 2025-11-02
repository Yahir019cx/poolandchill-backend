import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class EncryptedContactDto {
  @ApiProperty({
    example: 'SGVsbG8gV29ybGQhIFRoaXMgaXMgYSBiYXNlNjQgZW5jb2RlZCBlbmNyeXB0ZWQgc3RyaW5nLi4u',
    description: 'Datos del formulario cifrados en formato base64. Contiene: [16 bytes salt] + [12 bytes IV] + [datos cifrados con AES-GCM]',
  })
  @IsNotEmpty({ message: 'Los datos cifrados son requeridos' })
  @IsString({ message: 'Los datos deben ser un string' })
  data: string;
}
