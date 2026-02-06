export const colors = {
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

export const logoUrl =
  'https://firebasestorage.googleapis.com/v0/b/poolandchillapp.firebasestorage.app/o/Brand%2FLogoNewPC.png?alt=media&token=dd61cc81-f322-4833-813d-337b473d1e68';

/**
 * Envuelve contenido en el layout base de emails de Pool & Chill
 * @param badge Texto del badge (ej: "Propiedad Aprobada")
 * @param content HTML del contenido específico del email
 */
export function wrapInBaseTemplate(badge: string, content: string): string {
  return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${colors.gray}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${colors.gray};">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: ${colors.white}; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-radius: 16px; overflow: hidden;">

              <!-- Header -->
              <tr>
                <td align="center" style="background: linear-gradient(135deg, ${colors.dark} 0%, ${colors.secondary} 100%); padding: 40px 30px;">
                  <img src="${logoUrl}" alt="Pool & Chill" width="150" style="display: block; max-width: 150px; height: auto; margin: 0 auto;" />
                </td>
              </tr>

              <!-- Badge -->
              <tr>
                <td align="center" style="padding: 30px 30px 20px 30px;">
                  <span style="display: inline-block; background: ${colors.primary}; color: ${colors.white}; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${badge}</span>
                </td>
              </tr>

              <!-- Contenido -->
              ${content}

              <!-- Separador -->
              <tr>
                <td style="padding: 0 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="border-top: 1px solid #E0E0E0;"></td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Disclaimer -->
              <tr>
                <td style="padding: 25px 40px;">
                  <p style="margin: 0; color: ${colors.textLight}; font-size: 13px; line-height: 1.5; text-align: center;">
                    Este es un mensaje automático. Si tienes dudas, contacta a nuestro equipo de soporte.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td align="center" style="background: linear-gradient(135deg, ${colors.dark} 0%, ${colors.secondary} 100%); padding: 35px 30px;">
                  <img src="${logoUrl}" alt="Pool & Chill" width="100" style="display: block; max-width: 100px; height: auto; margin: 0 auto 15px auto; opacity: 0.9;" />
                  <p style="margin: 0 0 10px 0; color: ${colors.primary}; font-size: 15px; font-weight: 500; font-style: italic;">Relájate, disfruta y reserva</p>
                  <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 500;">&copy; ${new Date().getFullYear()} Pool & Chill. Todos los derechos reservados.</p>
                  <p style="margin: 0; color: ${colors.primary}; font-size: 11px; font-weight: 500;">Sistema de notificaciones automáticas</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
