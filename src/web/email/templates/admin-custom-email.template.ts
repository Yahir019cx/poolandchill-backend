import { colors, wrapInBaseTemplate } from './base.template';

export function adminCustomEmailTemplate(subject: string, message: string): string {
  const htmlMessage = message.replace(/\n/g, '<br>');

  const content = `
    <tr>
      <td align="center" style="padding: 0 40px 36px 40px; text-align: left;">

        <h1 style="margin: 0 0 20px 0; color: ${colors.dark}; font-size: 22px; font-weight: 700; text-align: center;">
          ${subject}
        </h1>

        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="background-color: #F0F9F9; border-radius: 12px; padding: 28px 32px; border-top: 3px solid ${colors.primary};">
              <p style="margin: 0; color: ${colors.textDark}; font-size: 15px; line-height: 1.8;">
                ${htmlMessage}
              </p>
            </td>
          </tr>
        </table>

        <p style="margin: 28px 0 0 0; color: ${colors.textLight}; font-size: 13px; text-align: center; line-height: 1.6;">
          Si tienes preguntas, no dudes en contactar a nuestro equipo de soporte.
        </p>

      </td>
    </tr>
  `;

  return wrapInBaseTemplate('Mensaje Oficial', content);
}
