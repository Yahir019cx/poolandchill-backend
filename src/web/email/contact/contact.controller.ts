import { Controller, Post, Body } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContactDto } from '../dto/contact.dto';

@ApiTags('Contact')
@Controller('web/contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: 'Enviar mensaje desde el formulario de contacto' })
  @ApiResponse({
    status: 201,
    description: 'Correo enviado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos en la solicitud',
  })
  async sendMail(@Body() body: ContactDto) {
    return await this.contactService.sendContactMail(body);
  }
}
