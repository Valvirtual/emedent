import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyWebhookSignature, getMediaInfo, downloadMediaBuffer } from '@/lib/whatsapp'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

type WhatsAppMessage = {
  from: string
  id: string
  timestamp: string
  type: string
  text?: { body: string }
  image?: { id: string; mime_type: string }
  audio?: { id: string; mime_type: string }
  document?: { id: string; mime_type: string; filename?: string }
}

type WhatsAppStatus = {
  id: string
  status: string
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256')

  if (!verifyWebhookSignature(rawBody, signature)) {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  const value = payload?.entry?.[0]?.changes?.[0]?.value

  if (!value) return NextResponse.json({ ok: true })

  const supabase = createAdminClient()

  if (value.statuses?.length) {
    for (const status of value.statuses as WhatsAppStatus[]) {
      await supabase.from('messages').update({ status: status.status }).eq('wa_message_id', status.id)
    }
  }

  if (value.messages?.length) {
    const contactName = value.contacts?.[0]?.profile?.name ?? null
    for (const msg of value.messages as WhatsAppMessage[]) {
      await handleInboundMessage(supabase, msg, contactName)
    }
  }

  return NextResponse.json({ ok: true })
}

async function handleInboundMessage(
  supabase: ReturnType<typeof createAdminClient>,
  msg: WhatsAppMessage,
  contactName: string | null
) {
  const waPhone = msg.from

  let { data: patient } = await supabase.from('patients').select('id').eq('phone', waPhone).maybeSingle()
  if (!patient) {
    const { data: created } = await supabase
      .from('patients')
      .insert({ name: contactName ?? waPhone, phone: waPhone })
      .select('id')
      .single()
    patient = created
  }

  let { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('wa_phone', waPhone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!conversation) {
    const { data: created } = await supabase
      .from('conversations')
      .insert({ patient_id: patient?.id, wa_phone: waPhone })
      .select('id')
      .single()
    conversation = created
  } else {
    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation.id)
  }

  const mediaField = msg.image ?? msg.audio ?? msg.document
  let mediaPath: string | null = null
  let contentType = 'text'
  if (msg.image) contentType = 'image'
  else if (msg.audio) contentType = 'audio'
  else if (msg.document) contentType = 'document'

  if (mediaField) {
    try {
      const info = await getMediaInfo(mediaField.id)
      const buffer = await downloadMediaBuffer(info.url)
      const ext = info.mime_type.split('/')[1]?.split(';')[0] ?? 'bin'
      const path = `${patient?.id}/${msg.id}.${ext}`
      await supabase.storage.from('patient-media').upload(path, buffer, { contentType: info.mime_type })
      mediaPath = path
    } catch (err) {
      console.error('Falha ao baixar/guardar mídia do WhatsApp:', err)
    }
  }

  await supabase.from('messages').insert({
    conversation_id: conversation?.id,
    direction: 'inbound',
    sender: 'patient',
    wa_message_id: msg.id,
    content_type: contentType,
    content: msg.text?.body ?? null,
    media_path: mediaPath,
    status: 'received',
    raw_payload: msg,
  })

  if (msg.text?.body && patient?.id) {
    await handleReminderReply(supabase, patient.id, msg.text.body)
  }
}

const CONFIRM_WORDS = ['sim', 's', 'yes', 'y', 'sí', 'si']
const CANCEL_WORDS = ['não', 'nao', 'n', 'no']

async function handleReminderReply(
  supabase: ReturnType<typeof createAdminClient>,
  patientId: string,
  text: string
) {
  const normalized = text.trim().toLowerCase()
  const isConfirm = CONFIRM_WORDS.includes(normalized)
  const isCancel = CANCEL_WORDS.includes(normalized)
  if (!isConfirm && !isCancel) return

  // só age sobre a próxima consulta pendente que já recebeu lembrete (reminder_sent_at preenchido)
  const { data: appointment } = await supabase
    .from('appointments')
    .select('id')
    .eq('patient_id', patientId)
    .in('status', ['scheduled', 'confirmed'])
    .not('reminder_sent_at', 'is', null)
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!appointment) return

  await supabase
    .from('appointments')
    .update({ status: isConfirm ? 'confirmed' : 'cancelled' })
    .eq('id', appointment.id)
}
