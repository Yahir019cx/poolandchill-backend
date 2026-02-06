import { colors, wrapInBaseTemplate } from './base.template';

export function propertyRejectedTemplate(
  firstName: string,
  propertyName: string,
  reason: string,
): string {
  const content = `
    <tr>
      <td style="padding: 0 40px 30px 40px;">
        <h1 style="margin: 0 0 20px 0; color: ${colors.textDark}; font-size: 24px; font-weight: 700; text-align: center;">
          Hola ${firstName}
        </h1>
        <p style="margin: 0 0 25px 0; color: ${colors.textDark}; font-size: 16px; line-height: 1.6; text-align: center;">
          Lamentamos informarte que tu propiedad <strong>"${propertyName}"</strong> no fue aprobada después de la revisión de nuestro equipo.
        </p>

        <!-- Motivo del rechazo -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="background-color: #FFF3F3; padding: 20px; border-radius: 8px; border-left: 4px solid #E74C3C;">
              <p style="margin: 0 0 8px 0; color: ${colors.textDark}; font-size: 15px; font-weight: 600;">
                Motivo del rechazo
              </p>
              <p style="margin: 0; color: ${colors.textDark}; font-size: 14px; line-height: 1.5;">
                ${reason}
              </p>
            </td>
          </tr>
        </table>

        <!-- Siguiente paso -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px;">
          <tr>
            <td style="background-color: ${colors.light}; padding: 20px; border-radius: 8px; border-left: 4px solid ${colors.primary};">
              <p style="margin: 0 0 8px 0; color: ${colors.textDark}; font-size: 15px; font-weight: 600;">
                ¿Qué puedes hacer?
              </p>
              <p style="margin: 0; color: ${colors.textDark}; font-size: 14px; line-height: 1.5;">
                Revisa las observaciones, realiza los ajustes necesarios y vuelve a enviar tu propiedad para revisión. Estamos aquí para ayudarte.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  return wrapInBaseTemplate('Propiedad Rechazada', content);
}
