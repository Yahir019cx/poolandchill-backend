import { Injectable } from '@nestjs/common';
import { GraphMailService } from '../graph-mail.service';
import { ContactDto } from '../dto/contact.dto';

@Injectable()
export class ContactService {
  constructor(private readonly graphMail: GraphMailService) {}

  async sendContactMail(data: ContactDto) {
    const aliasReceptor = 'contacto@poolandchill.com.mx';

    const subject =
      data.rol === 'huésped'
        ? `Nuevo mensaje de un huésped: ${data.nombre}`
        : `Nuevo registro de anfitrión: ${data.nombre}`;

    let htmlBody = `
      <h2>📩 Formulario recibido desde ${aliasReceptor}</h2>
      <p><strong>Alias receptor:</strong> ${aliasReceptor}</p>
      <p><strong>Rol del usuario:</strong> ${data.rol}</p>
      <hr>
      <p><strong>Nombre:</strong> ${data.nombre}</p>
      <p><strong>Correo:</strong> ${data.correo}</p>
      ${data.telefono ? `<p><strong>Teléfono:</strong> ${data.telefono}</p>` : ''}
    `;

    if (data.rol === 'anfitrión') {
      htmlBody += `
        <hr>
        <p><strong>Tipos de espacio:</strong> ${data.tipoEspacio?.join(', ') || 'N/A'}</p>
        <p><strong>Nombre del lugar:</strong> ${data.nombreLugar || 'N/A'}</p>
        <p><strong>Dirección:</strong> ${data.direccion || 'N/A'}</p>
        <p><strong>Descripción:</strong> ${data.descripcion || 'N/A'}</p>
      `;
    }

    htmlBody += `
      <hr>
      <p><strong>Mensaje:</strong><br>${data.mensaje || '(Sin mensaje adicional)'}</p>
    `;

    return await this.graphMail.sendMail(aliasReceptor, subject, htmlBody);
  }
}
