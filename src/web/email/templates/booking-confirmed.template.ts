import { colors, wrapInBaseTemplate } from './base.template';

export interface BookingConfirmedTemplateParams {
  guestName: string;
  bookingCode: string;
  bookingType: 'hourly' | 'daily';
  bookingDate?: string;
  checkInDate?: string;
  checkOutDate?: string;
  numberOfNights?: number;
  basePrice: number;
  guestServiceFee: number;
  totalIVA: number;
  totalGuestPayment: number;
  qrCodeCid: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function bookingConfirmedTemplate(params: BookingConfirmedTemplateParams): string {
  const {
    guestName,
    bookingCode,
    bookingType,
    bookingDate,
    checkInDate,
    checkOutDate,
    numberOfNights,
    basePrice,
    guestServiceFee,
    totalIVA,
    totalGuestPayment,
    qrCodeCid,
  } = params;

  const datesRow =
    bookingType === 'hourly' && bookingDate
      ? `<p style="margin: 0 0 6px 0; font-size: 14px; color: ${colors.textDark};">
           📅 <strong>Fecha:</strong> ${formatDate(bookingDate)}
         </p>`
      : `<p style="margin: 0 0 6px 0; font-size: 14px; color: ${colors.textDark};">
           📅 <strong>Check-in:</strong> ${checkInDate ? formatDate(checkInDate) : '—'}
         </p>
         <p style="margin: 0 0 6px 0; font-size: 14px; color: ${colors.textDark};">
           📅 <strong>Check-out:</strong> ${checkOutDate ? formatDate(checkOutDate) : '—'}
         </p>
         ${numberOfNights ? `<p style="margin: 0 0 6px 0; font-size: 14px; color: ${colors.textDark};">🌙 <strong>Noches:</strong> ${numberOfNights}</p>` : ''}`;

  const content = `
    <tr>
      <td style="padding: 0 40px 30px 40px;">

        <h1 style="margin: 0 0 8px 0; color: ${colors.textDark}; font-size: 24px; font-weight: 700; text-align: center;">
          ¡Tu reserva está confirmada!
        </h1>
        <p style="margin: 0 0 28px 0; color: ${colors.textLight}; font-size: 15px; line-height: 1.6; text-align: center;">
          Hola <strong>${guestName}</strong>, tu pago fue procesado y tu lugar está asegurado.
        </p>

        <!-- Código de reserva -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
          <tr>
            <td align="center" style="background: linear-gradient(135deg, ${colors.dark} 0%, ${colors.secondary} 100%); padding: 16px; border-radius: 10px;">
              <p style="margin: 0 0 4px 0; color: rgba(255,255,255,0.7); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Código de reserva</p>
              <p style="margin: 0; color: ${colors.white}; font-size: 22px; font-weight: 700; letter-spacing: 2px;">${bookingCode}</p>
            </td>
          </tr>
        </table>

        <!-- Detalle de la reserva -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
          <tr>
            <td style="background-color: ${colors.light}; padding: 20px; border-radius: 10px; border-left: 4px solid ${colors.primary};">
              <p style="margin: 0 0 12px 0; color: ${colors.secondary}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                Detalle de la reserva
              </p>
              ${datesRow}
            </td>
          </tr>
        </table>

        <!-- Resumen de pago -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
          <tr>
            <td style="background-color: #FAFAFA; padding: 20px; border-radius: 10px; border: 1px solid #E8E8E8;">
              <p style="margin: 0 0 14px 0; color: ${colors.secondary}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                Resumen de pago
              </p>

              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: ${colors.textDark};">Precio base</td>
                  <td align="right" style="padding: 4px 0; font-size: 14px; color: ${colors.textDark};">${formatCurrency(basePrice)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: ${colors.textDark};">Tarifa de servicio (5%)</td>
                  <td align="right" style="padding: 4px 0; font-size: 14px; color: ${colors.textDark};">${formatCurrency(guestServiceFee)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: ${colors.textDark};">IVA (16%)</td>
                  <td align="right" style="padding: 4px 0; font-size: 14px; color: ${colors.textDark};">${formatCurrency(totalIVA)}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 10px 0 0 0; border-top: 1px solid #E0E0E0;"></td>
                </tr>
                <tr>
                  <td style="font-size: 16px; font-weight: 700; color: ${colors.dark};">Total pagado</td>
                  <td align="right" style="font-size: 16px; font-weight: 700; color: ${colors.primary};">${formatCurrency(totalGuestPayment)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- QR Code -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
          <tr>
            <td align="center">
              <p style="margin: 0 0 12px 0; color: ${colors.textDark}; font-size: 15px; font-weight: 600;">
                Tu código QR de acceso
              </p>
              <img src="cid:${qrCodeCid}"
                   alt="Código QR de acceso"
                   width="200"
                   height="200"
                   style="display: block; border: 3px solid ${colors.light}; border-radius: 12px; padding: 8px; background: white;" />
              <p style="margin: 12px 0 0 0; color: ${colors.textLight}; font-size: 12px; line-height: 1.5; text-align: center;">
                Presenta este QR al llegar a la propiedad.<br/>
                Es único e intransferible.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  `;

  return wrapInBaseTemplate('Reserva Confirmada', content);
}
