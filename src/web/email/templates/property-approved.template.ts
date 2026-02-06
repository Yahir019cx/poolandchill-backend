import { colors, wrapInBaseTemplate } from './base.template';

export function propertyApprovedTemplate(
  firstName: string,
  propertyName: string,
): string {
  const content = `
    <tr>
      <td style="padding: 0 40px 30px 40px;">
        <h1 style="margin: 0 0 20px 0; color: ${colors.textDark}; font-size: 24px; font-weight: 700; text-align: center;">
          ¡Felicidades ${firstName}!
        </h1>
        <p style="margin: 0 0 25px 0; color: ${colors.textDark}; font-size: 16px; line-height: 1.6; text-align: center;">
          Tu propiedad <strong>"${propertyName}"</strong> ha sido revisada y <strong>aprobada</strong> por nuestro equipo.
        </p>

        <!-- Caja de éxito -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="background-color: ${colors.light}; padding: 20px; border-radius: 8px; border-left: 4px solid ${colors.primary};">
              <p style="margin: 0 0 8px 0; color: ${colors.textDark}; font-size: 15px; font-weight: 600;">
                Tu propiedad ya está activa
              </p>
              <p style="margin: 0; color: ${colors.textDark}; font-size: 14px; line-height: 1.5;">
                A partir de ahora tu espacio es visible para todos los usuarios de Pool & Chill y podrás recibir reservaciones.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  return wrapInBaseTemplate('Propiedad Aprobada', content);
}
