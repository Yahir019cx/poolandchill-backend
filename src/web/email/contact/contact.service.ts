import { Injectable } from '@nestjs/common';
import { GraphMailService } from '../graph-mail.service';
import { ContactDto } from '../dto/contact.dto';

@Injectable()
export class ContactService {
  private readonly colors = {
    primary: '#3CA2A2',
    secondary: '#215A6D',
    green: '#8EBDB6',
    light: '#DFECE6',
    dark: '#063940',
    white: '#FFFFFF',
    gray: '#F8F9FA',
    textDark: '#333333',
    textLight: '#666666',
  };

  private readonly logoUrl = 'https://firebasestorage.googleapis.com/v0/b/poolandchillapp.firebasestorage.app/o/Brand%2FlogoLT.png?alt=media&token=85af76c9-5a06-467c-a7da-729025ba753a';

  constructor(private readonly graphMail: GraphMailService) {}

  async sendContactMail(data: ContactDto) {
    const aliasReceptor = 'contacto@poolandchill.com.mx';

    const subject =
      data.rol === 'huésped'
        ? `Nuevo mensaje de un huésped: ${data.nombre}`
        : `Nuevo registro de anfitrión: ${data.nombre}`;

    const htmlBody = this.getEmailTemplate(data, aliasReceptor);

    return await this.graphMail.sendMail(aliasReceptor, subject, htmlBody);
  }

  private getEmailTemplate(data: ContactDto, aliasReceptor: string): string {
    const currentDate = new Date().toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      dateStyle: 'long',
      timeStyle: 'short',
    });

    const rolBadge = data.rol === 'huésped'
      ? `<span style="display: inline-block; background: ${this.colors.primary}; color: ${this.colors.white}; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Huésped</span>`
      : `<span style="display: inline-block; background: ${this.colors.green}; color: ${this.colors.white}; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Anfitrión</span>`;

    const subtitulo = data.rol === 'huésped'
      ? 'Mensaje de Huésped'
      : 'Registro de Anfitrión';

    return `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Nuevo Formulario de Contacto - Pool & Chill</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: ${this.colors.gray}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${this.colors.gray};">
          <tr>
            <td align="center" style="padding: 40px 20px;">

              <!-- Contenedor principal -->
              <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: ${this.colors.white}; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-radius: 16px; overflow: hidden;">

                <!-- Badge de rol -->
                <tr>
                  <td align="center" style="padding: 5px 30px 10px 30px;">
                    ${rolBadge}
                  </td>
                </tr>

                <!-- Datos de contacto -->
                <tr>
                  <td style="padding: 30px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td>
                          <h2 style="margin: 0 0 20px 0; color: ${this.colors.textDark}; font-size: 18px; font-weight: 700; padding-bottom: 10px; border-bottom: 3px solid ${this.colors.primary};">Datos de Contacto</h2>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <p style="margin: 0 0 6px 0; color: ${this.colors.textLight}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;">Nombre</p>
                          <p style="margin: 0; color: ${this.colors.textDark}; font-size: 16px; font-weight: 500;">${data.nombre}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <p style="margin: 0 0 6px 0; color: ${this.colors.textLight}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;">Correo Electrónico</p>
                          <p style="margin: 0;"><a href="mailto:${data.correo}" style="color: ${this.colors.primary}; font-size: 16px; font-weight: 500; text-decoration: none;">${data.correo}</a></p>
                        </td>
                      </tr>
                      ${data.telefono ? `
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <p style="margin: 0 0 6px 0; color: ${this.colors.textLight}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;">Teléfono</p>
                          <p style="margin: 0;"><a href="tel:${data.telefono}" style="color: ${this.colors.primary}; font-size: 16px; font-weight: 500; text-decoration: none;">${data.telefono}</a></p>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>

                ${this.getHostSection(data)}

                <!-- Mensaje -->
                ${data.mensaje ? `
                <tr>
                  <td style="padding: 0 30px 30px 30px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td>
                          <h2 style="margin: 0 0 20px 0; color: ${this.colors.textDark}; font-size: 18px; font-weight: 700; padding-bottom: 10px; border-bottom: 3px solid ${this.colors.primary};">Mensaje</h2>
                        </td>
                      </tr>
                      <tr>
                        <td style="background-color: ${this.colors.light}; padding: 20px; border-radius: 8px; border-left: 4px solid ${this.colors.primary};">
                          <p style="margin: 0; color: ${this.colors.textDark}; font-size: 15px; line-height: 1.6;">${data.mensaje}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}

                <!-- Información del sistema -->
                <tr>
                  <td style="padding: 20px 30px; background-color: ${this.colors.gray}; border-top: 1px solid #E0E0E0;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td>
                          <p style="margin: 0 0 8px 0; color: ${this.colors.textLight}; font-size: 13px;">
                            <strong>Destinatario:</strong> ${aliasReceptor}
                          </p>
                          <p style="margin: 0; color: ${this.colors.textLight}; font-size: 13px;">
                            <strong>Fecha y hora:</strong> ${currentDate} (Hora de México)
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, ${this.colors.dark} 0%, ${this.colors.secondary} 100%); padding: 40px 30px;">
                    <img src="${this.logoUrl}" alt="Pool & Chill" width="120" style="display: block; max-width: 120px; height: auto; margin: 0 auto 20px auto; opacity: 0.9;" />
                    <p style="margin: 0 0 10px 0; color: ${this.colors.primary}; font-size: 16px; font-weight: 500; font-style: italic;">Relájate, disfruta y reserva</p>


                    <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.9); font-size: 13px; font-weight: 500;">© 2025 Pool & Chill. Todos los derechos reservados.</p>
                    <p style="margin: 0; color: ${this.colors.primary}; font-size: 12px; font-weight: 500;">Sistema de notificaciones automáticas</p>
                  </td>
                </tr>

              </table>
              <!-- Fin contenedor principal -->

            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  private getHostSection(data: ContactDto): string {
    if (data.rol !== 'anfitrión') {
      return '';
    }

    const spaceBadges = data.tipoEspacio?.map(tipo => this.getSpaceBadge(tipo)).join(' ') || 'N/A';

    return `
      <tr>
        <td style="padding: 0 30px 30px 30px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <h2 style="margin: 0 0 20px 0; color: ${this.colors.textDark}; font-size: 18px; font-weight: 700; padding-bottom: 10px; border-bottom: 3px solid ${this.colors.primary};">Información del Espacio</h2>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 16px;">
                <p style="margin: 0 0 10px 0; color: ${this.colors.textLight}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;">Tipos de Espacio</p>
                <div style="margin: 0;">${spaceBadges}</div>
              </td>
            </tr>
            ${data.nombreLugar ? `
            <tr>
              <td style="padding-bottom: 16px;">
                <p style="margin: 0 0 6px 0; color: ${this.colors.textLight}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;">Nombre del Lugar</p>
                <p style="margin: 0; color: ${this.colors.textDark}; font-size: 16px; font-weight: 500;">${data.nombreLugar}</p>
              </td>
            </tr>
            ` : ''}
            ${data.direccion ? `
            <tr>
              <td style="padding-bottom: 16px;">
                <p style="margin: 0 0 6px 0; color: ${this.colors.textLight}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;">Dirección</p>
                <p style="margin: 0; color: ${this.colors.textDark}; font-size: 16px; font-weight: 500;">${data.direccion}</p>
              </td>
            </tr>
            ` : ''}
            ${data.descripcion ? `
            <tr>
              <td style="padding-bottom: 16px;">
                <p style="margin: 0 0 10px 0; color: ${this.colors.textLight}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;">Descripción</p>
                <div style="background-color: ${this.colors.light}; padding: 16px; border-radius: 8px; border-left: 4px solid ${this.colors.primary};">
                  <p style="margin: 0; color: ${this.colors.textDark}; font-size: 15px; line-height: 1.6;">${data.descripcion}</p>
                </div>
              </td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    `;
  }

  private getSpaceBadge(tipo: string): string {
    const tipoLower = tipo.toLowerCase();
    let backgroundColor = this.colors.primary;

    if (tipoLower.includes('cabaña')) {
      backgroundColor = this.colors.green;
    } else if (tipoLower.includes('alberca') || tipoLower.includes('piscina')) {
      backgroundColor = this.colors.primary;
    } else if (tipoLower.includes('camping') || tipoLower.includes('camp')) {
      backgroundColor = this.colors.secondary;
    }

    return `<span style="display: inline-block; background-color: ${backgroundColor}; color: ${this.colors.white}; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; margin: 0 6px 6px 0;">${tipo}</span>`;
  }
}