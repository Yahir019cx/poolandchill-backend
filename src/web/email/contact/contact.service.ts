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

                <!-- Header con gradiente -->
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, ${this.colors.primary} 0%, ${this.colors.secondary} 100%); padding: 25px 30px 30px 30px;">
                    <img src="${this.logoUrl}" alt="Pool & Chill Logo" width="180" style="display: block; max-width: 180px; height: auto; margin: 0 auto 10px auto;" />
                    <h1 style="margin: 0 0 10px 0; color: ${this.colors.white}; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Nuevo Formulario de Contacto</h1>
                    <p style="margin: 0; color: rgba(255,255,255,0.95); font-size: 16px; font-weight: 500;">${subtitulo}</p>
                  </td>
                </tr>

                <!-- Badge de rol -->
                <tr>
                  <td align="center" style="padding: 25px 30px 10px 30px;">
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
                    <p style="margin: 0 0 20px 0; color: ${this.colors.primary}; font-size: 16px; font-weight: 500; font-style: italic;">Relájate, disfruta y reserva</p>

                    <!-- Redes sociales -->
                    <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 20px auto;">
                      <tr>
                        <td align="center" style="padding: 0 8px;">
                          <a href="https://facebook.com/poolandchill" target="_blank" style="display: inline-block; width: 36px; height: 36px; background-color: ${this.colors.primary}; border-radius: 50%; text-align: center; line-height: 36px;">
                            <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjRkZGRkZGIj48cGF0aCBkPSJNMjQgMTIuMDczYzAtNi42MjctNS4zNzMtMTItMTItMTJzLTEyIDUuMzczLTEyIDEyYzAgNS45OSA0LjM4OCAxMC45NTQgMTAuMTI1IDExLjg1NHYtOC4zODVINy4wNzh2LTMuNDdoMy4wNDd2LTIuNjRjMC0zLjAwNyAxLjc5Mi00LjY2OSA0LjUzMy00LjY2OSAxLjMxMiAwIDIuNjg2LjIzNCAyLjY4Ni4yMzR2Mi45NTNoLTEuNTE0Yy0xLjQ5MSAwLTEuOTU1LjkyNS0xLjk1NSAxLjg3NHYyLjI1aDMuMzI4bC0uNTMyIDMuNDdoLTIuNzk2djguMzg1QzE5LjYxMiAyMy4wMjcgMjQgMTguMDYyIDI0IDEyLjA3M3oiLz48L3N2Zz4=" alt="Facebook" width="20" height="20" style="display: block; border: 0;" />
                          </a>
                        </td>
                        <td align="center" style="padding: 0 8px;">
                          <a href="https://instagram.com/poolandchill" target="_blank" style="display: inline-block; width: 36px; height: 36px; background-color: ${this.colors.primary}; border-radius: 50%; text-align: center; line-height: 36px;">
                            <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjRkZGRkZGIj48cGF0aCBkPSJNMTIgMi4xNjNjMy4yMDQgMCAzLjU4NC4wMTIgNC44NS4wNyAzLjI1Mi4xNDggNC43NzEgMS42OTEgNC45MTkgNC45MTkuMDU4IDEuMjY1LjA2OSAxLjY0NS4wNjkgNC44NDkgMCAzLjIwNS0uMDEyIDMuNTg0LS4wNjkgNC44NDktLjE0OSAzLjIyNS0xLjY2NCA0Ljc3MS00LjkxOSA0LjkxOS0xLjI2Ni4wNTgtMS42NDQuMDctNC44NS4wNy0zLjIwNCAwLTMuNTg0LS4wMTItNC44NDktLjA3LTMuMjYtLjE0OS00Ljc3MS0xLjY5OS00LjkxOS00LjkyLS4wNTgtMS4yNjUtLjA3LTEuNjQ0LS4wNy00Ljg0OSAwLTMuMjA0LjAxMy0zLjU4My4wNy00Ljg0OS4xNDktMy4yMjcgMS42NjQtNC43NzEgNC45MTktNC45MTkgMS4yNjYtLjA1NyAxLjY0NS0uMDY5IDQuODQ5LS4wNjl6TTEyIDBDOC43NDEgMCA4LjMzMy4wMTQgNy4wNTMuMDcyIDIuNjk1LjI3Mi4yNzMgMi42OS4wNzMgNy4wNTIuMDE0IDguMzMzIDAgOC43NDEgMCAxMnMuMDE0IDMuNjY4LjA3MiA0Ljk0OGMuMiA0LjM1OCAyLjYxOCA2Ljc4IDYuOTggNi45OEM4LjMzMyAyMy45ODYgOC43NDEgMjQgMTIgMjRzMy42NjgtLjAxNCA0Ljk0OC0uMDcyYzQuMzU0LS4yIDYuNzgyLTIuNjE4IDYuOTc5LTYuOTguMDU4LTEuMjguMDczLTEuNjg5LjA3My00Ljk0OHMtLjAxNS0zLjY2Ny0uMDcyLTQuOTQ3Yy0uMTk2LTQuMzU0LTIuNjE3LTYuNzgtNi45NzktNi45OEMxNS42NjguMDE0IDE1LjI1OSAwIDEyIDB6bTAgNS44MzhhNi4xNjIgNi4xNjIgMCAxIDAgMCAxMi4zMjQgNi4xNjIgNi4xNjIgMCAwIDAgMC0xMi4zMjR6TTEyIDE2YTQgNCAwIDEgMSAwLTggNCA0IDAgMCAxIDAgOHptNi40MDYtMTEuODQ1YTEuNDQgMS40NCAwIDEgMCAwIDIuODggMS40NCAxLjQ0IDAgMCAwIDAtMi44OHoiLz48L3N2Zz4=" alt="Instagram" width="20" height="20" style="display: block; border: 0;" />
                          </a>
                        </td>
                        <td align="center" style="padding: 0 8px;">
                          <a href="https://tiktok.com/@poolandchill" target="_blank" style="display: inline-block; width: 36px; height: 36px; background-color: ${this.colors.primary}; border-radius: 50%; text-align: center; line-height: 36px;">
                            <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjRkZGRkZGIj48cGF0aCBkPSJNMTkuNTg5IDYuNjg2YTQuNzkzIDQuNzkzIDAgMCAxLTMuNzctNC4yNDVWMmgtNC42Njd2MTMuNjcyYTIuODk2IDIuODk2IDAgMSAxLTIuMzEtMi44OTF2LTQuODQ1YTcuNjU2IDcuNjU2IDAgMCAwLTEuMDEtLjA2NkM0LjAyMSA3Ljg3IDEgMTAuODkyIDEgMTQuNjExYzAgMy43MiAzLjAyMSA2Ljc0MSA2Ljc0MiA2Ljc0MSAxLjg3MiAwIDMuNTY4LS43NjUgNC43OTQtMi4wMDEgMS41MzUtMS41NSAyLjQ4OC0zLjY4NSAyLjQ4OC02LjA0VjcuODM3YTkuNDcxIDkuNDcxIDAgMCAwIDQuNTY1IDEuMTY2VjQuMzM3YTQuNSA0LjUgMCAwIDEtLjAwMSAyLjM0OXoiLz48L3N2Zz4=" alt="TikTok" width="20" height="20" style="display: block; border: 0;" />
                          </a>
                        </td>
                      </tr>
                    </table>

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