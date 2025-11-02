import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContactDto } from '../dto/contact.dto';
import { EncryptedContactDto } from '../dto/encrypted-contact.dto';
import { EncryptionService } from '../utils/encryption.service';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@ApiTags('Contact')
@Controller('web/contact')
export class ContactController {
  constructor(
    private readonly contactService: ContactService,
    private readonly encryptionService: EncryptionService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Enviar mensaje desde el formulario de contacto',
    description: 'Recibe datos cifrados con AES-GCM y los procesa para enviar un correo electrónico',
  })
  @ApiResponse({
    status: 201,
    description: 'Correo enviado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos en la solicitud o error en el descifrado',
  })
  async sendMail(@Body() body: EncryptedContactDto) {
    // Validar que el campo data esté presente y sea un string base64 válido
    if (!this.encryptionService.isValidBase64(body.data)) {
      throw new BadRequestException('El campo data debe ser un string base64 válido');
    }

    // Descifrar los datos
    const decryptedData = this.encryptionService.decrypt<ContactDto>(body.data);

    // Validar el payload descifrado contra el ContactDto
    const contactDto = plainToClass(ContactDto, decryptedData);
    const errors = await validate(contactDto);

    if (errors.length > 0) {
      const errorMessages = errors
        .map(error => Object.values(error.constraints || {}).join(', '))
        .join('; ');
      throw new BadRequestException(`Datos descifrados inválidos: ${errorMessages}`);
    }

    // Enviar el correo con los datos validados
    return await this.contactService.sendContactMail(contactDto);
  }
}
