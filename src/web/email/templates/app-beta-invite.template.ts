import { colors, wrapInBaseTemplate, logoUrl } from './base.template';

const playStoreUrl =
  'https://play.google.com/store/apps/details?id=com.poolandchill.app';

const playStoreBadgeUrl =
  'https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg';

export function appBetaInviteTemplate(): string {
  const content = `
    <tr>
      <td align="center" style="padding: 0 40px 36px 40px; text-align: center;">

        <!-- Saludo -->
        <h1 style="margin: 0 0 8px 0; color: ${colors.dark}; font-size: 24px; font-weight: 700; text-align: center;">
          Ya puedes probar Pool & Chill
        </h1>
        <p style="margin: 0 0 28px 0; color: ${colors.textLight}; font-size: 15px; line-height: 1.7; text-align: center;">
          Nos emociona invitarte a explorar nuestra app en su <strong style="color: ${colors.dark};">entorno de pruebas</strong>.
          Queremos que te familiarices con la experiencia antes del lanzamiento oficial.
        </p>

        <!-- Que puedes hacer -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
          <tr>
            <td style="background-color: #F0F9F9; border-radius: 12px; padding: 24px 28px; border-top: 3px solid ${colors.primary};">
              <p style="margin: 0 0 16px 0; color: ${colors.secondary}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; text-align: center;">
                Que puedes hacer
              </p>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: ${colors.textDark}; line-height: 1.6;">
                    <span style="color: ${colors.primary}; font-weight: 700; margin-right: 8px;">&#10003;</span>
                    Navegar y explorar propiedades disponibles
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: ${colors.textDark}; line-height: 1.6;">
                    <span style="color: ${colors.primary}; font-weight: 700; margin-right: 8px;">&#10003;</span>
                    Registrarte y crear tu perfil
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: ${colors.textDark}; line-height: 1.6;">
                    <span style="color: ${colors.primary}; font-weight: 700; margin-right: 8px;">&#10003;</span>
                    Conocer el flujo de reservas y pagos
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: ${colors.textDark}; line-height: 1.6;">
                    <span style="color: ${colors.primary}; font-weight: 700; margin-right: 8px;">&#10003;</span>
                    Darnos tu feedback para mejorar la experiencia
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- CTA - Descargar app -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, ${colors.dark} 0%, ${colors.secondary} 100%); border-radius: 12px; padding: 16px 40px;">
                    <a href="${playStoreUrl}" target="_blank" style="color: ${colors.white}; font-size: 16px; font-weight: 700; text-decoration: none; display: inline-block;">
                      Descargar en Google Play
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Nota de entorno de pruebas -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
          <tr>
            <td style="background-color: #FFF9E6; border-radius: 10px; padding: 18px 24px; border-left: 4px solid #F5A623;">
              <p style="margin: 0 0 6px 0; color: #8B6914; font-size: 13px; font-weight: 700;">
                Entorno de pruebas
              </p>
              <p style="margin: 0; color: #8B6914; font-size: 13px; line-height: 1.6;">
                Esta es una version de prueba. Los datos y transacciones no son reales.
                Tu feedback nos ayuda a construir una mejor experiencia para todos.
              </p>
            </td>
          </tr>
        </table>

        <!-- Slogan -->
        <p style="margin: 0; color: ${colors.primary}; font-size: 16px; font-weight: 600; font-style: italic; text-align: center;">
          El lujo de elegir
        </p>

      </td>
    </tr>
  `;

  return wrapInBaseTemplate('Beta Tester', content);
}
