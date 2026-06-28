'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Image as ImageIcon, Music } from 'lucide-react'

type MediaMessage = {
  id: string
  content_type: string
  media_path: string
  created_at: string
}

const iconFor: Record<string, typeof ImageIcon> = { image: ImageIcon, audio: Music, document: FileText }

export default function PatientMedia({ patientId }: { patientId: string }) {
  const supabase = createClient()
  const [items, setItems] = useState<(MediaMessage & { url: string | null })[]>([])

  useEffect(() => {
    async function load() {
      const { data: conversations } = await supabase.from('conversations').select('id').eq('patient_id', patientId)
      const conversationIds = (conversations ?? []).map(c => c.id)
      if (!conversationIds.length) return

      const { data: messages } = await supabase
        .from('messages')
        .select('id, content_type, media_path, created_at')
        .in('conversation_id', conversationIds)
        .not('media_path', 'is', null)
        .order('created_at', { ascending: false })

      const withUrls = await Promise.all(
        (messages ?? []).map(async m => {
          const { data } = await supabase.storage.from('patient-media').createSignedUrl(m.media_path!, 3600)
          return { ...m, url: data?.signedUrl ?? null }
        })
      )
      setItems(withUrls as (MediaMessage & { url: string | null })[])
    }
    load()
  }, [patientId])

  return (
    <div className="bg-white rounded-lg border">
      <div className="px-5 py-3 border-b font-medium text-sm">Documentos e mídia</div>
      {!items.length ? (
        <div className="px-5 py-6 text-sm text-muted-foreground">Sem ficheiros recebidos</div>
      ) : (
        <div className="p-5 grid grid-cols-4 gap-3">
          {items.map(m => {
            const Icon = iconFor[m.content_type] ?? FileText
            return (
              <a
                key={m.id}
                href={m.url ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-lg border hover:bg-gray-50 text-center"
              >
                {m.content_type === 'image' && m.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="w-full h-20 object-cover rounded" />
                ) : (
                  <Icon className="w-6 h-6 text-muted-foreground" />
                )}
                <span className="text-[11px] text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</span>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
