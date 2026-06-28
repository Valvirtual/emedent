'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

type Patient = {
  id: string
  name: string
  phone: string
  email: string | null
  birth_date: string | null
  insurance_provider: string | null
  clinical_notes: string | null
  medical_history: string | null
  next_followup_date: string | null
  status: string
  preferred_language: string
  created_at: string
}

const empty: Omit<Patient, 'id' | 'created_at'> = {
  name: '', phone: '', email: '', birth_date: '', insurance_provider: '',
  clinical_notes: '', medical_history: '', next_followup_date: '', status: 'active', preferred_language: 'pt',
}

const languageLabels: Record<string, string> = { pt: 'PT', en: 'EN', es: 'ES' }

export default function PatientsPage() {
  const supabase = createClient()
  const [patients, setPatients] = useState<Patient[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Patient | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('patients').select('*').order('created_at', { ascending: false })
    setPatients(data ?? [])
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }

  function openEdit(p: Patient) {
    setEditing(p)
    setForm({
      name: p.name, phone: p.phone, email: p.email ?? '', birth_date: p.birth_date ?? '',
      insurance_provider: p.insurance_provider ?? '', clinical_notes: p.clinical_notes ?? '',
      medical_history: p.medical_history ?? '', next_followup_date: p.next_followup_date ?? '',
      status: p.status, preferred_language: p.preferred_language,
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.name || !form.phone) return toast.error('Nome e telefone são obrigatórios')
    setSaving(true)

    const payload = {
      ...form,
      birth_date: form.birth_date || null,
      next_followup_date: form.next_followup_date || null,
    }

    let error
    if (editing) {
      ({ error } = await supabase.from('patients').update(payload).eq('id', editing.id))
    } else {
      ({ error } = await supabase.from('patients').insert(payload))
    }

    setSaving(false)
    if (error) { toast.error('Erro ao guardar: ' + error.message); return }
    toast.success(editing ? 'Paciente atualizado' : 'Paciente criado')
    setOpen(false)
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('patients').delete().eq('id', id)
    toast.success('Paciente eliminado')
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pacientes</h1>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Novo paciente</Button>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Telefone</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Convénio</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Idioma</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Próximo retorno</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {patients.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Sem pacientes</td></tr>
            )}
            {patients.map(p => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/dashboard/patients/${p.id}`} className="hover:underline">{p.name}</Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.phone}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.insurance_provider || '—'}</td>
                <td className="px-4 py-3"><Badge variant="outline">{languageLabels[p.preferred_language] ?? p.preferred_language}</Badge></td>
                <td className="px-4 py-3 text-muted-foreground">{p.next_followup_date ?? '—'}</td>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar paciente' : 'Novo paciente'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone (E.164) *</Label>
                <Input placeholder="+34..." value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data de nascimento</Label>
                <Input type="date" value={form.birth_date ?? ''} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Convénio/seguro</Label>
                <Input value={form.insurance_provider ?? ''} onChange={e => setForm(f => ({ ...f, insurance_provider: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Próximo retorno</Label>
                <Input type="date" value={form.next_followup_date ?? ''} onChange={e => setForm(f => ({ ...f, next_followup_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Idioma preferido</Label>
                <Select value={form.preferred_language} onValueChange={v => setForm(f => ({ ...f, preferred_language: v ?? 'pt' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v ?? 'active' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Histórico médico</Label>
              <Textarea value={form.medical_history ?? ''} onChange={e => setForm(f => ({ ...f, medical_history: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Observações clínicas</Label>
              <Textarea value={form.clinical_notes ?? ''} onChange={e => setForm(f => ({ ...f, clinical_notes: e.target.value }))} rows={2} />
            </div>
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
