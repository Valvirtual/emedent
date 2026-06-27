// Alerta por e-mail quando o envio de WhatsApp falha (API fora do ar, token revogado, etc).
// Usa a API HTTP do Resend diretamente, sem precisar de SDK extra.
export async function sendAlertEmail(subject: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.ALERT_EMAIL
  if (!apiKey || !to) {
    console.error('Alerta não enviado (RESEND_API_KEY ou ALERT_EMAIL não configurados):', subject, message)
    return
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.ALERT_EMAIL_FROM ?? 'alertas@resend.dev',
        to,
        subject: `[Alerta CRM] ${subject}`,
        text: message,
      }),
    })
  } catch (err) {
    console.error('Falha ao enviar e-mail de alerta:', err)
  }
}
