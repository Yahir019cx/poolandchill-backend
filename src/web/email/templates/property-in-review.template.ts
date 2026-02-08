import { colors, wrapInBaseTemplate } from './base.template';

export function propertyInReviewTemplate(
  propertyName: string,
): string {
  const content = `
    <tr>
      <td style="padding: 0 40px 30px 40px;">
        <h1 style="margin: 0 0 20px 0; color: ${colors.textDark}; font-size: 24px; font-weight: 700; text-align: center;">
          ¡Tu propiedad fue enviada!
        </h1>
        <p style="margin: 0 0 25px 0; color: ${colors.textDark}; font-size: 16px; line-height: 1.6; text-align: center;">
          Tu propiedad <strong>"${propertyName}"</strong> ha sido enviada a revisión por nuestro equipo.
        </p>

        <!-- Caja de info -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="background-color: ${colors.light}; padding: 20px; border-radius: 8px; border-left: 4px solid ${colors.primary};">
              <p style="margin: 0 0 8px 0; color: ${colors.textDark}; font-size: 15px; font-weight: 600;">
                ¿Qué sigue?
              </p>
              <p style="margin: 0; color: ${colors.textDark}; font-size: 14px; line-height: 1.5;">
                Nuestro equipo revisará tu propiedad y recibirás un correo electrónico cuando sea aprobada o si necesitamos algún ajuste.
              </p>
            </td>
          </tr>
        </table>

        <!-- Separador -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 35px;">
          <tr>
            <td style="border-top: 1px dashed #D0D0D0; padding-top: 30px;">
              <h2 style="margin: 0 0 15px 0; color: ${colors.textDark}; font-size: 20px; font-weight: 700; text-align: center;">
                ¡Estás invitado!
              </h2>
              <p style="margin: 0 0 25px 0; color: ${colors.textDark}; font-size: 15px; line-height: 1.6; text-align: center;">
                Celebra con nosotros el lanzamiento de <strong>Pool & Chill</strong>. Confirma tu asistencia al evento.
              </p>
            </td>
          </tr>
        </table>

        <!-- Botón -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center">
              <a href="https://poolandchill.com.mx/invitacion"
                 target="_blank"
                 style="display: inline-block; background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%); color: ${colors.white}; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; text-decoration: none; letter-spacing: 0.5px;">
                Confirmar asistencia
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  return wrapInBaseTemplate('Propiedad en Revisión', content);
}
