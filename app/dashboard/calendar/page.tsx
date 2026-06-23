'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Sparkles, ChevronLeft, ChevronRight, Pencil, Trash2, Download, Copy } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns'
import { pt } from 'date-fns/locale'
import Image from 'next/image'

type Post = {
  id: string
  title: string
  body: string
  platform: string[]
  scheduled_at: string
  status: 'draft' | 'scheduled' | 'published'
  created_at: string
  image_url?: string
}

const PLATFORMS = ['instagram', 'linkedin', 'facebook', 'tiktok', 'twitter']

const platformColors: Record<string, string> = {
  instagram: 'bg-pink-100 text-pink-700',
  linkedin: 'bg-blue-100 text-blue-700',
  facebook: 'bg-indigo-100 text-indigo-700',
  tiktok: 'bg-gray-100 text-gray-700',
  twitter: 'bg-sky-100 text-sky-700',
}

export default function CalendarPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<Post[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selected, setSelected] = useState<Post | null>(null)
  const [generatingStage, setGeneratingStage] = useState<'idle' | 'text' | 'image'>('idle')
  const [form, setForm] = useState({
    topic: '',
    platform: 'instagram',
    tone: '',
    scheduled_at: format(new Date(), 'yyyy-MM-dd'),
    title: '',
    body: '',
    image_url: '',
    generated: false,
  })

  async function load() {
    const start = startOfMonth(currentMonth).toISOString()
    const end = endOfMonth(currentMonth).toISOString()
    const { data } = await supabase
      .from('content_posts')
      .select('*')
      .gte('scheduled_at', start)
      .lte('scheduled_at', end)
      .order('scheduled_at')
    setPosts(data ?? [])
  }

  useEffect(() => { load() }, [currentMonth])

  async function handleGenerate() {
    if (!form.topic) return toast.error('Introduza um tema')
    try {
      const { data: config } = await supabase
        .from('config')
        .select('company_name, industry, target_audience, audience_detail, description, usp, tone_of_voice, location, primary_color')
        .single()

      setGeneratingStage('text')
      const res = await fetch('/api/ai/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: form.topic,
          platform: form.platform,
          tone: form.tone || config?.tone_of_voice || '',
          companyName: config?.company_name ?? 'Nossa empresa',
          industry: config?.industry ?? '',
          targetAudience: config?.target_audience ?? 'b2c',
          audienceDetail: config?.audience_detail ?? '',
          description: config?.description ?? '',
          usp: config?.usp ?? '',
          location: config?.location ?? '',
        }),
      })
      const result = await res.json()
      setForm(f => ({ ...f, title: result.title, body: result.body, generated: true }))
      toast.success('Texto gerado')

      setGeneratingStage('image')
      const imageRes = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: form.topic,
          body: result.body,
          industry: config?.industry ?? '',
          tone: form.tone || config?.tone_of_voice || '',
          primaryColor: config?.primary_color ?? '',
          companyName: config?.company_name ?? 'Nossa empresa',
        }),
      })
      const imageResult = await imageRes.json()
      if (imageResult.image_url) {
        setForm(f => ({ ...f, image_url: imageResult.image_url }))
        toast.success('Imagem gerada')
      } else {
        toast.error('Erro ao gerar imagem')
      }
    } catch {
      toast.error('Erro ao gerar conteúdo')
    } finally {
      setGeneratingStage('idle')
    }
  }

  async function handleSave() {
    if (!form.title || !form.body) return toast.error('Gere ou escreva o conteúdo primeiro')

    const { error } = await supabase.from('content_posts').insert({
      title: form.title,
      body: form.body,
      platform: [form.platform],
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      status: 'draft',
      image_url: form.image_url || null,
    })

    if (error) { toast.error('Erro ao guardar'); return }
    toast.success('Post adicionado ao calendário')
    setOpen(false)
    setForm({ topic: '', platform: 'instagram', tone: '', scheduled_at: format(new Date(), 'yyyy-MM-dd'), title: '', body: '', image_url: '', generated: false })
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('content_posts').delete().eq('id', id)
    toast.success('Post eliminado')
    setEditOpen(false)
    load()
  }

  async function handleStatusChange(id: string, status: string) {
    await supabase.from('content_posts').update({ status }).eq('id', id)
    load()
  }

  async function handleCopyText(text: string) {
    await navigator.clipboard.writeText(text)
    toast.success('Texto copiado')
  }

  async function handleDownloadImage(url: string, title: string) {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const slug = title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `${slug || 'post'}.jpg`
    a.click()
    URL.revokeObjectURL(blobUrl)
  }

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const startPad = getDay(startOfMonth(currentMonth))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Calendário de Conteúdo</h1>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Novo post</Button>
      </div>

      {/* Navegação mês */}
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: pt })}
        </span>
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Grid calendário */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[90px] border-b border-r bg-gray-50" />
          ))}
          {days.map(day => {
            const dayPosts = posts.filter(p => isSameDay(new Date(p.scheduled_at), day))
            return (
              <div key={day.toISOString()} className="min-h-[90px] border-b border-r p-1.5">
                <p className="text-xs text-muted-foreground mb-1">{format(day, 'd')}</p>
                <div className="space-y-0.5">
                  {dayPosts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelected(p); setEditOpen(true) }}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-xs truncate ${platformColors[p.platform?.[0]] ?? 'bg-gray-100 text-gray-700'}`}
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dialog novo post */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Plataforma</Label>
                <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v ?? 'instagram' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tema / assunto</Label>
              <Input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="ex: Promoção de verão, Novo produto..." />
            </div>
            <div className="space-y-1.5">
              <Label>Tom de voz (opcional)</Label>
              <Input value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))} placeholder="ex: divertido, formal, motivador..." />
            </div>
            <Button variant="outline" onClick={handleGenerate} disabled={generatingStage !== 'idle'} className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              {generatingStage === 'text' ? 'A gerar texto...' : generatingStage === 'image' ? 'A gerar imagem...' : 'Gerar com IA'}
            </Button>
            {form.generated && (
              <>
                <div className="space-y-1.5">
                  <Label>Título</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Conteúdo</Label>
                  <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={5} />
                </div>
                {generatingStage === 'image' && (
                  <div className="aspect-square w-full rounded-md bg-gray-100 animate-pulse" />
                )}
                {form.image_url && (
                  <div className="relative aspect-square w-full overflow-hidden rounded-md border">
                    <Image src={form.image_url} alt="Imagem gerada" fill className="object-cover" />
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.generated}>Guardar no calendário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog ver/editar post */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${platformColors[selected?.platform?.[0] ?? ''] ?? ''}`}>
                {selected?.platform?.[0]}
              </span>
              <span className="text-xs text-muted-foreground">
                {selected?.scheduled_at ? format(new Date(selected.scheduled_at), 'dd MMM yyyy', { locale: pt }) : ''}
              </span>
            </div>
            {selected?.image_url && (
              <div className="relative aspect-square w-full max-w-[200px] overflow-hidden rounded-md border">
                <Image src={selected.image_url} alt={selected.title} fill className="object-cover" />
              </div>
            )}
            <p className="text-sm whitespace-pre-wrap">{selected?.body}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => selected && handleCopyText(selected.body)}>
                <Copy className="w-3.5 h-3.5 mr-1" />Copiar texto
              </Button>
              {selected?.image_url && (
                <Button variant="outline" size="sm" onClick={() => handleDownloadImage(selected.image_url!, selected.title)}>
                  <Download className="w-3.5 h-3.5 mr-1" />Descarregar imagem
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Estado:</Label>
              <Select value={selected?.status ?? 'draft'} onValueChange={v => { if (selected && v) handleStatusChange(selected.id, v) }}>
                <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="destructive" size="sm" onClick={() => selected && handleDelete(selected.id)}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />Eliminar
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
