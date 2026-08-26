'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

type Conversation = {
  id: string
  patient_id: string | null
  wa_phone: string
  status: string
  priority: string
  ai_enabled: boolean
  last_message_at: string
  patients?: { name: string } | null
}

type Message = {
  id: string
  conversation_id: string
  direction: 'inbound' | 'outbound'
  sender: string
  content: string | null
  content_type: string
  media_path: string | null
  intent: string | null
  created_at: string
}

export default function InboxPage() {
  const supabase = createClient()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function loadConversations() {
    const { data } = await supabase
      .from('conversations')
      .select('*, patients(name)')
      .order('priority', { ascending: true })
      .order('last_message_at', { ascending: false })
    setConversations(data ?? [])
  }

  async function loadMessages(conversationId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
  }

  useEffect(() => { loadConversations() }, [])

  useEffect(() => {
    if (selectedId) loadMessages(selectedId)
  }, [selectedId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const msg = payload.new as Message
        if (msg.conversation_id === selectedId) {
          setMessages(prev => [...prev, msg])
        }
        loadConversations()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedId])

  async function toggleAi(conv: Conversation) {
    const turningOn = !conv.ai_enabled
    await supabase
      .from('conversations')
      .update({
        ai_enabled: turningOn,
        // reativar a IA manualmente também tira a conversa de needs_human, senão fica presa
        status: turningOn && conv.status === 'needs_human' ? 'open' : conv.status,
      })
      .eq('id', conv.id)
    loadConversations()
  }

  async function handleSend() {
    if (!selectedId || !reply.trim()) return
    setSending(true)
    const res = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: selectedId, body: reply }),
    })
    setSending(false)
    if (!res.ok) { toast.error('Erro ao enviar mensagem'); return }
    setReply('')
    loadMessages(selectedId)
  }

  const selected = conversations.find(c => c.id === selectedId)

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      <div className="w-72 bg-white rounded-lg border overflow-y-auto">
        {conversations.length === 0 && (
          <div className="text-center py-10 text-sm text-muted-foreground">Sem conversas</div>
        )}
        {conversations.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedId(c.id)}
            className={cn(
              'w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors',
              selectedId === c.id && 'bg-gray-100'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm truncate">{c.patients?.name ?? c.wa_phone}</span>
              {c.priority === 'urgent' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">URGENTE</span>
              )}
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">{c.status === 'needs_human' ? 'Precisa de humano' : c.status}</span>
              {!c.ai_enabled && <span className="text-[10px] text-muted-foreground">IA desligada</span>}
            </div>
          </button>
        ))}
      </div>

      <div className="flex-1 bg-white rounded-lg border flex flex-col">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Selecione uma conversa
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{selected.patients?.name ?? selected.wa_phone}</div>
                <div className="text-xs text-muted-foreground">{selected.wa_phone}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => toggleAi(selected)}>
                IA {selected.ai_enabled ? 'ativa' : 'desligada'}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map(m => (
                <div key={m.id} className={cn('flex', m.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-md px-3 py-2 rounded-lg text-sm',
                      m.direction === 'outbound' ? 'bg-primary text-primary-foreground' : 'bg-gray-100'
                    )}
                  >
                    {m.content_type !== 'text' && !m.content && (
                      <span className="italic text-xs opacity-80">[{m.content_type}]</span>
                    )}
                    {m.content}
                    {m.intent && (
                      <div className="text-[10px] opacity-70 mt-1">intenção: {m.intent}</div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="p-3 border-t flex gap-2">
              <Textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Escreva uma resposta..."
                rows={1}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
              />
              <Button onClick={handleSend} disabled={sending || !reply.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
