import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyWebhookSignature, getMediaInfo, downloadMediaBuffer, sendWhatsAppMessage } from '@/lib/whatsapp'
import { generateAiReply } from '@/lib/ai-agent'

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
    .select('id, ai_enabled, status, needs_human_since')
    .eq('wa_phone', waPhone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!conversation) {
    const { data: created } = await supabase
      .from('conversations')
      .insert({ patient_id: patient?.id, wa_phone: waPhone })
      .select('id, ai_enabled, status, needs_human_since')
      .single()
    conversation = created
  } else {
    const hoursSinceEscalated = conversation.needs_human_since
      ? (Date.now() - new Date(conversation.needs_human_since).getTime()) / 3_600_000
      : 0

    // conversa escalada há mais de 24h sem ninguém resolver é tratada como um novo
    // contacto e sai do needs_human sozinha (needs_human_since não muda a cada mensagem,
    // só quando entra/sai desse estado, ao contrário de last_message_at)
    if (conversation.status === 'needs_human' && hoursSinceEscalated > 24) {
      conversation.status = 'open'
      conversation.needs_human_since = null
    }

    await supabase
      .from('conversations')
      .update({ status: conversation.status, needs_human_since: conversation.needs_human_since, last_message_at: new Date().toISOString() })
      .eq('id', conversation.id)
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

  if (!conversation?.id) return

  if (contentType !== 'text') {
    if (conversation.status !== 'needs_human') {
      await supabase.from('conversations').update({ status: 'needs_human', needs_human_since: new Date().toISOString() }).eq('id', conversation.id)
    }
    return
  }

  if (!msg.text?.body) return

  const handledByReminderFlow = patient?.id
    ? await handleReminderReply(supabase, patient.id, msg.text.body)
    : false

  if (handledByReminderFlow) return
  if (!conversation.ai_enabled || conversation.status === 'needs_human') return

  try {
    const ai = await generateAiReply(supabase, conversation.id, patient?.id ?? null)
    const result = await sendWhatsAppMessage(waPhone, ai.reply)
    const waMessageId = result.messages?.[0]?.id ?? null

    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      direction: 'outbound',
      sender: 'ai',
      wa_message_id: waMessageId,
      content_type: 'text',
      content: ai.reply,
      intent: ai.intent,
      status: 'sent',
    })

    await supabase
      .from('conversations')
      .update({
        status: ai.needs_human ? 'needs_human' : 'open',
        needs_human_since: ai.needs_human ? new Date().toISOString() : null,
        priority: ai.priority,
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversation.id)

    if (patient?.id) {
      await supabase.from('patients').update({ preferred_language: ai.detected_language }).eq('id', patient.id)
    }
  } catch (err) {
    console.error('Falha ao gerar/enviar resposta da IA:', err)
    await supabase.from('conversations').update({ status: 'needs_human', needs_human_since: new Date().toISOString() }).eq('id', conversation.id)
  }
}

const CONFIRM_WORDS = ['sim', 's', 'yes', 'y', 'sí', 'si']
const CANCEL_WORDS = ['não', 'nao', 'n', 'no']

async function handleReminderReply(
  supabase: ReturnType<typeof createAdminClient>,
  patientId: string,
  text: string
): Promise<boolean> {
  const normalized = text.trim().toLowerCase()
  const isConfirm = CONFIRM_WORDS.includes(normalized)
  const isCancel = CANCEL_WORDS.includes(normalized)
  if (!isConfirm && !isCancel) return false

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

  if (!appointment) return false

  await supabase
    .from('appointments')
    .update({ status: isConfirm ? 'confirmed' : 'cancelled' })
    .eq('id', appointment.id)

  return true
}
