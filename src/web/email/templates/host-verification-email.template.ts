import { colors, wrapInBaseTemplate } from './base.template';

/**
 * Template de email para solicitar verificación de identidad al anfitrión.
 * El botón lleva a FRONTEND_URL/login; tras login el front redirige a /verification/start y Didit.
 *
 * @param firstName - Nombre del anfitrión
 * @param loginUrl - URL completa de login (FRONTEND_URL + '/login')
 */
export function hostVerificationEmailTemplate(
  firstName: string,
  loginUrl: string,
): string {
  const content = `
    <tr>
      <td style="padding: 0 40px 30px 40px;">
        <h1 style="margin: 0 0 20px 0; color: ${colors.textDark}; font-size: 24px; font-weight: 700; text-align: center;">
          Hola ${firstName}
        </h1>
        <p style="margin: 0 0 25px 0; color: ${colors.textDark}; font-size: 16px; line-height: 1.6; text-align: center;">
          Para poder aceptar y publicar tu propiedad en <strong>Pool & Chill</strong> necesitamos que verifiques tu identidad.
        </p>
        <p style="margin: 0 0 25px 0; color: ${colors.textDark}; font-size: 16px; line-height: 1.6; text-align: center;">
          Haz clic en el siguiente botón para iniciar sesión y completar la verificación en unos minutos:
        </p>

        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="padding: 10px 0 30px 0;">
              <a href="${loginUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%); color: ${colors.white}; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(60, 162, 162, 0.4);">
                Verificar mi usuario
              </a>
            </td>
          </tr>
        </table>

        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="background-color: ${colors.light}; padding: 16px 20px; border-radius: 8px; border-left: 4px solid ${colors.primary};">
              <p style="margin: 0; color: ${colors.textDark}; font-size: 14px; line-height: 1.5;">
                <strong>Importante:</strong> Después de iniciar sesión serás guiado para completar la verificación de identidad. Es un proceso rápido y seguro.
              </p>
            </td>
          </tr>
        </table>

        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px;">
          <tr>
            <td style="padding: 12px 16px; border-radius: 8px; border: 1px solid #E0E0E0;">
              <p style="margin: 0 0 4px 0; color: ${colors.textLight}; font-size: 13px; line-height: 1.5;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin: 0; color: ${colors.primary}; font-size: 12px; line-height: 1.5; word-break: break-all;">
                ${loginUrl}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  return wrapInBaseTemplate('Verificación de Anfitrión', content);
}
