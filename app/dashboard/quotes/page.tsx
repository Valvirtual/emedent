'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Eye, Trash2, Sparkles } from 'lucide-react'

type Quote = {
  id: string
  client_name: string
  services: string[]
  total: number
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  content: string
  created_at: string
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const SERVICES = [
  'Gestão de redes sociais',
  'Criação de conteúdo',
  'Publicidade online (Meta Ads)',
  'Publicidade online (Google Ads)',
  'SEO',
  'Email marketing',
  'Website',
  'Fotografia/Vídeo',
  'Branding',
  'Consultoria de marketing',
]

export default function QuotesPage() {
  const supabase = createClient()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [open, setOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [selected, setSelected] = useState<Quote | null>(null)
  const [clientName, setClientName] = useState('')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [generating, setGenerating] = useState(false)

  async function load() {
    const { data } = await supabase.from('quotes').select('*').order('created_at', { ascending: false })
    setQuotes(data ?? [])
  }

  useEffect(() => { load() }, [])

  function toggleService(s: string) {
    setSelectedServices(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  async function handleGenerate() {
    if (!clientName || selectedServices.length === 0) {
      return toast.error('Preencha o nome do cliente e seleccione pelo menos um serviço')
    }
    setGenerating(true)

    try {
      const { data: config } = await supabase.from('config').select('company_name, industry').single()

      const res = await fetch('/api/ai/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          services: selectedServices,
          notes,
          companyName: config?.company_name ?? 'Nossa empresa',
          industry: config?.industry ?? '',
        }),
      })

      const result = await res.json()

      const { error } = await supabase.from('quotes').insert({
        client_name: clientName,
        services: selectedServices,
        total: result.total,
        status: 'draft',
        content: result.content,
      })

      if (error) throw error

      toast.success('Orçamento gerado')
      setOpen(false)
      setClientName('')
      setSelectedServices([])
      setNotes('')
      load()
    } catch {
      toast.error('Erro ao gerar orçamento')
    } finally {
      setGenerating(false)
    }
  }

  async function handleStatusChange(id: string, status: string) {
    await supabase.from('quotes').update({ status }).eq('id', id)
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('quotes').delete().eq('id', id)
    toast.success('Orçamento eliminado')
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Orçamentos</h1>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Novo orçamento</Button>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Serviços</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {quotes.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">Sem orçamentos</td></tr>
            )}
            {quotes.map(q => (
              <tr key={q.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{q.client_name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{(q.services ?? []).slice(0, 2).join(', ')}{(q.services ?? []).length > 2 ? '...' : ''}</td>
                <td className="px-4 py-3 font-semibold">€{q.total?.toLocaleString('pt-PT')}</td>
                <td className="px-4 py-3">
                  <Select value={q.status} onValueChange={v => v && handleStatusChange(q.id, v)}>
                    <SelectTrigger className={`w-28 h-7 text-xs ${statusColors[q.status]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="sent">Enviado</SelectItem>
                      <SelectItem value="accepted">Aceite</SelectItem>
                      <SelectItem value="rejected">Rejeitado</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => { setSelected(q); setViewOpen(true) }}><Eye className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(q.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog criar orçamento */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerar orçamento com IA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do cliente *</Label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="ex: Restaurante Bella Vita" />
            </div>
            <div className="space-y-1.5">
              <Label>Serviços *</Label>
              <div className="flex flex-wrap gap-2">
                {SERVICES.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleService(s)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                      selectedServices.includes(s)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-white text-muted-foreground border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Contexto adicional, orçamento do cliente, prazo..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleGenerate} disabled={generating}>
              <Sparkles className="w-4 h-4 mr-2" />
              {generating ? 'A gerar...' : 'Gerar com IA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog ver orçamento */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Orçamento — {selected?.client_name}</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">
            {selected?.content}
          </div>
          <div className="border-t pt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total estimado</span>
            <span className="text-xl font-bold">€{selected?.total?.toLocaleString('pt-PT')}</span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
