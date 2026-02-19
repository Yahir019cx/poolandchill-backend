import { colors, wrapInBaseTemplate } from './base.template';

const MAPS_URL = 'https://maps.app.goo.gl/4VZoZRjCr7kgPqJB6?g_st=ic';

export function invitationConfirmedTemplate(
  nombre: string,
  invitados: number,
): string {
  const content = `
    <tr>
      <td style="padding: 0 40px 30px 40px;">
        <h1 style="margin: 0 0 20px 0; color: ${colors.textDark}; font-size: 24px; font-weight: 700; text-align: center;">
          ¡Tu asistencia fue confirmada, ${nombre}!
        </h1>
        <p style="margin: 0 0 25px 0; color: ${colors.textDark}; font-size: 16px; line-height: 1.6; text-align: center;">
          Hemos registrado tu asistencia junto con la de <strong>${invitados} ${invitados === 1 ? 'invitado' : 'invitados'}</strong>. ¡Nos alegra que vengas!
        </p>

        <!-- Caja de detalle -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
          <tr>
            <td style="background-color: ${colors.light}; padding: 20px; border-radius: 8px; border-left: 4px solid ${colors.primary};">
              <p style="margin: 0 0 8px 0; color: ${colors.textDark}; font-size: 15px; font-weight: 600;">
                Detalles de tu confirmación
              </p>
              <p style="margin: 0; color: ${colors.textDark}; font-size: 14px; line-height: 1.5;">
                Nombre: <strong>${nombre}</strong><br/>
                Invitados adicionales: <strong>${invitados}</strong>
              </p>
            </td>
          </tr>
        </table>

        <!-- Botón de ubicación -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center">
              <a href="${MAPS_URL}"
                 target="_blank"
                 style="display: inline-block; background-color: ${colors.primary}; color: ${colors.white}; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px;">
                Ver ubicación
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  return wrapInBaseTemplate('Asistencia Confirmada', content);
}
