import crypto from 'crypto'
import { sendAlertEmail } from '@/lib/alert'

const GRAPH_API_VERSION = 'v21.0'

function graphUrl() {
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
}

async function postToGraphApi(body: Record<string, unknown>) {
  const res = await fetch(graphUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    await sendAlertEmail(
      'Falha ao enviar mensagem de WhatsApp',
      `Status ${res.status} ao chamar a Graph API.\n\nResposta: ${errText}\n\nBody enviado: ${JSON.stringify(body)}`
    )
    throw new Error(`WhatsApp send failed: ${res.status} ${errText}`)
  }

  return res.json() as Promise<{ messages?: { id: string }[] }>
}

export async function sendWhatsAppMessage(to: string, body: string) {
  return postToGraphApi({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body },
  })
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  params: string[] = []
) {
  return postToGraphApi({
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: params.length
        ? [{ type: 'body', parameters: params.map(text => ({ type: 'text', text })) }]
        : undefined,
    },
  })
}

export async function getMediaInfo(mediaId: string): Promise<{ url: string; mime_type: string }> {
  const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
  })
  if (!res.ok) throw new Error(`Falha ao obter info da mídia ${mediaId}: ${res.status}`)
  return res.json()
}

export async function downloadMediaBuffer(mediaUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
  })
  if (!res.ok) throw new Error(`Falha ao baixar mídia: ${res.status}`)
  return res.arrayBuffer()
}

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET
  if (!appSecret || !signatureHeader) return false

  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')

  // comparação em tempo constante para evitar timing attack
  const a = Buffer.from(expected)
  const b = Buffer.from(signatureHeader)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
