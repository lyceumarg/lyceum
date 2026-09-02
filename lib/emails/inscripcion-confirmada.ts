export function inscripcionConfirmadaHtml({
  alumnoNombre, curso, academia, cursarUrl,
}: { alumnoNombre: string | null; curso: string; academia: string; cursarUrl: string }) {
  const saludo = alumnoNombre ? `¡Listo, ${alumnoNombre}! Ya estás inscripto.` : "¡Listo! Ya estás inscripto.";
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f5f5f2;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f2;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border:1px solid #dcdee8;border-radius:14px;overflow:hidden;">
        <tr><td style="background-color:#15171e;padding:24px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:10px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="28" height="28" style="background-color:#ffffff;border-radius:50%;">
                <tr><td align="center" valign="middle" style="font-size:14px;line-height:28px;color:#2a2f77;">✓</td></tr>
              </table>
            </td>
            <td style="font-size:18px;font-weight:bold;color:#ffffff;">Lyceum</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:32px 32px 8px;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#2a2f77;font-weight:bold;">
            Inscripción confirmada
          </p>
          <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#15171e;">
            ${saludo}
          </h1>
          <p style="margin:0 0 24px;font-size:14.5px;line-height:1.6;color:#43465a;">
            Quedaste inscripto en <strong>${curso}</strong>, de ${academia}. Ya podés empezar a cursar cuando quieras.
          </p>
        </td></tr>
        <tr><td align="center" style="padding:0 32px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="background-color:#2a2f77;border-radius:11px;">
              <a href="${cursarUrl}" target="_blank"
                 style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">
                Empezar a cursar →
              </a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:0 32px 28px;">
          <p style="margin:0;font-size:11.5px;line-height:1.6;color:#8a8da0;">
            Este es un mail automático enviado por Lyceum, la plataforma que usa ${academia} para gestionar cursos y certificaciones.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
