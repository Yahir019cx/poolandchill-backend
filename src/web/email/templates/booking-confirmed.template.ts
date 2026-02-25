import { colors, wrapInBaseTemplate } from './base.template';

export interface BookingConfirmedTemplateParams {
  guestName: string;
  bookingCode: string;
  bookingType: 'hourly' | 'daily';
  bookingDate?: string;
  checkInDate?: string;
  checkOutDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
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
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function bookingConfirmedTemplate(params: BookingConfirmedTemplateParams): string {
  const {
    guestName,
    bookingCode,
    bookingType,
    bookingDate,
    checkInDate,
    checkOutDate,
    checkInTime,
    checkOutTime,
    numberOfNights,
    basePrice,
    guestServiceFee,
    totalIVA,
    totalGuestPayment,
    qrCodeCid,
  } = params;

  // ── Bloque de fechas ────────────────────────────────────────────────────────
  let datesBlock: string;

  if (bookingType === 'hourly' && bookingDate) {
    datesBlock = `
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="background-color: #F0F9F9; border-radius: 8px; padding: 18px 20px; border-top: 3px solid ${colors.primary}; text-align: center;">
            <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: ${colors.primary}; font-weight: 700;">Fecha de la renta</p>
            <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: ${colors.dark};">${capitalize(formatDate(bookingDate))}</p>
            ${checkInTime && checkOutTime
              ? `<p style="margin: 0; font-size: 13px; color: ${colors.textLight};">De las ${checkInTime} a las ${checkOutTime}</p>`
              : checkInTime
              ? `<p style="margin: 0; font-size: 13px; color: ${colors.textLight};">A partir de las ${checkInTime}</p>`
              : ''}
          </td>
        </tr>
      </table>`;
  } else {
    datesBlock = `
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="48%" valign="top" style="background-color: #F0F9F9; border-radius: 8px; padding: 18px 16px; border-top: 3px solid ${colors.primary};">
            <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: ${colors.primary}; font-weight: 700;">Llegada</p>
            <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: ${colors.dark};">${checkInDate ? capitalize(formatDate(checkInDate)) : '—'}</p>
            ${checkInTime ? `<p style="margin: 0; font-size: 13px; color: ${colors.textLight};">A partir de las ${checkInTime}</p>` : ''}
          </td>
          <td width="4%"></td>
          <td width="48%" valign="top" style="background-color: #F0F9F9; border-radius: 8px; padding: 18px 16px; border-top: 3px solid ${colors.secondary};">
            <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: ${colors.secondary}; font-weight: 700;">Salida</p>
            <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: ${colors.dark};">${checkOutDate ? capitalize(formatDate(checkOutDate)) : '—'}</p>
            ${checkOutTime ? `<p style="margin: 0; font-size: 13px; color: ${colors.textLight};">Antes de las ${checkOutTime}</p>` : ''}
          </td>
        </tr>
      </table>
      ${numberOfNights ? `<p style="margin: 12px 0 0 0; text-align: center; font-size: 13px; color: ${colors.secondary}; font-weight: 600;">${numberOfNights} ${numberOfNights === 1 ? 'noche' : 'noches'}</p>` : ''}`;
  }

  // ── Contenido ───────────────────────────────────────────────────────────────
  const content = `
    <tr>
      <td style="padding: 0 40px 36px 40px;">

        <!-- Saludo -->
        <h1 style="margin: 0 0 6px 0; color: ${colors.dark}; font-size: 22px; font-weight: 700; text-align: center;">
          Tu reserva esta confirmada
        </h1>
        <p style="margin: 0 0 28px 0; color: ${colors.textLight}; font-size: 15px; line-height: 1.6; text-align: center;">
          Hola <strong style="color: ${colors.dark};">${guestName}</strong>, tu pago fue procesado exitosamente y tu lugar esta asegurado.
        </p>

        <!-- Codigo de reserva -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
          <tr>
            <td align="center" style="background: linear-gradient(135deg, ${colors.dark} 0%, ${colors.secondary} 100%); padding: 18px 24px; border-radius: 10px;">
              <p style="margin: 0 0 4px 0; color: rgba(255,255,255,0.65); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;">Codigo de reserva</p>
              <p style="margin: 0; color: ${colors.white}; font-size: 24px; font-weight: 700; letter-spacing: 3px;">${bookingCode}</p>
            </td>
          </tr>
        </table>

        <!-- Detalle de fechas -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
          <tr>
            <td style="background-color: ${colors.white}; padding: 20px; border-radius: 10px; border: 1px solid #E8E8E8;">
              <p style="margin: 0 0 16px 0; color: ${colors.secondary}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">
                Detalle de la reserva
              </p>
              ${datesBlock}
            </td>
          </tr>
        </table>

        <!-- Resumen de pago -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
          <tr>
            <td style="background-color: #FAFAFA; padding: 20px; border-radius: 10px; border: 1px solid #E8E8E8;">
              <p style="margin: 0 0 14px 0; color: ${colors.secondary}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">
                Resumen de pago
              </p>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 5px 0; font-size: 14px; color: ${colors.textDark};">Precio base</td>
                  <td align="right" style="padding: 5px 0; font-size: 14px; color: ${colors.textDark};">${formatCurrency(basePrice)}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-size: 14px; color: ${colors.textDark};">Tarifa de servicio (5%)</td>
                  <td align="right" style="padding: 5px 0; font-size: 14px; color: ${colors.textDark};">${formatCurrency(guestServiceFee)}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-size: 14px; color: ${colors.textDark};">IVA (16%)</td>
                  <td align="right" style="padding: 5px 0; font-size: 14px; color: ${colors.textDark};">${formatCurrency(totalIVA)}</td>
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

        <!-- QR de acceso -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: ${colors.secondary};">
                Codigo QR de acceso
              </p>
              <p style="margin: 0 0 16px 0; font-size: 13px; color: ${colors.textLight};">
                Presentalo al llegar a la propiedad
              </p>
              <img src="cid:${qrCodeCid}"
                   alt="Codigo QR de acceso"
                   width="220"
                   height="220"
                   style="display: block; margin: 0 auto; border: 2px solid #E8E8E8; border-radius: 12px; padding: 10px; background: white;" />
              <p style="margin: 14px 0 0 0; color: ${colors.textLight}; font-size: 12px; text-align: center;">
                Unico e intransferible. No lo compartas.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  `;

  return wrapInBaseTemplate('Reserva Confirmada', content);
}
