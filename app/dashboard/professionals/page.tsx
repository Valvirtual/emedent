'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

type Professional = {
  id: string
  name: string
  active: boolean
  created_at: string
}

export default function ProfessionalsPage() {
  const supabase = createClient()
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Professional | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('professionals').select('*').order('name')
    setProfessionals(data ?? [])
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setName('')
    setOpen(true)
  }

  function openEdit(p: Professional) {
    setEditing(p)
    setName(p.name)
    setOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) return toast.error('Nome obrigatório')
    setSaving(true)

    let error
    if (editing) {
      ({ error } = await supabase.from('professionals').update({ name }).eq('id', editing.id))
    } else {
      ({ error } = await supabase.from('professionals').insert({ name }))
    }

    setSaving(false)
    if (error) { toast.error('Erro ao guardar'); return }
    toast.success(editing ? 'Profissional atualizado' : 'Profissional criado')
    setOpen(false)
    load()
  }

  async function toggleActive(p: Professional) {
    await supabase.from('professionals').update({ active: !p.active }).eq('id', p.id)
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('professionals').delete().eq('id', id)
    toast.success('Profissional eliminado')
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Profissionais</h1>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Novo profissional</Button>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {professionals.length === 0 && (
              <tr><td colSpan={3} className="text-center py-10 text-muted-foreground">Sem profissionais</td></tr>
            )}
            {professionals.map(p => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(p)}>
                    <Badge className={p.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar profissional' : 'Novo profissional'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Nome *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Dr(a). ..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'A guardar...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
