import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { conversationId, body } = await req.json()
  if (!conversationId || !body) {
    return NextResponse.json({ error: 'conversationId e body são obrigatórios' }, { status: 400 })
  }

  const { data: conversation } = await supabase
    .from('conversations')
    .select('wa_phone')
    .eq('id', conversationId)
    .single()

  if (!conversation) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

  const result = await sendWhatsAppMessage(conversation.wa_phone, body)
  const waMessageId = result.messages?.[0]?.id ?? null

  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    direction: 'outbound',
    sender: 'staff',
    wa_message_id: waMessageId,
    content_type: 'text',
    content: body,
    status: 'sent',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId)

  return NextResponse.json({ ok: true })
}
