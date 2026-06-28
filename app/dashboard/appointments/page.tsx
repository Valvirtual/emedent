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
import { Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns'
import { pt } from 'date-fns/locale'

type Appointment = {
  id: string
  patient_id: string
  professional_id: string | null
  scheduled_at: string
  duration_minutes: number
  procedure: string | null
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  notes: string | null
  patients?: { name: string } | null
  professionals?: { name: string } | null
}

type Patient = { id: string; name: string }
type Professional = { id: string; name: string }

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-gray-100 text-gray-700',
  no_show: 'bg-yellow-100 text-yellow-700',
}

const empty = {
  patient_id: '', professional_id: '', scheduled_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  duration_minutes: 30, procedure: '', status: 'scheduled' as Appointment['status'], notes: '',
}

export default function AppointmentsPage() {
  const supabase = createClient()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [professionalFilter, setProfessionalFilter] = useState<string>('all')
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  async function load() {
    const start = startOfMonth(currentMonth).toISOString()
    const end = endOfMonth(currentMonth).toISOString()
    const { data } = await supabase
      .from('appointments')
      .select('*, patients(name), professionals(name)')
      .gte('scheduled_at', start)
      .lte('scheduled_at', end)
      .order('scheduled_at')
    setAppointments(data ?? [])
  }

  useEffect(() => { load() }, [currentMonth])

  useEffect(() => {
    async function loadOptions() {
      const [{ data: p }, { data: pr }] = await Promise.all([
        supabase.from('patients').select('id, name').order('name'),
        supabase.from('professionals').select('id, name').eq('active', true).order('name'),
      ])
      setPatients(p ?? [])
      setProfessionals(pr ?? [])
    }
    loadOptions()
  }, [])

  function openNew() {
    setForm(empty)
    setOpen(true)
  }

  async function handleSave() {
    if (!form.patient_id) return toast.error('Selecione um paciente')
    setSaving(true)

    const { error } = await supabase.from('appointments').insert({
      patient_id: form.patient_id,
      professional_id: form.professional_id || null,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: form.duration_minutes,
      procedure: form.procedure || null,
      status: form.status,
      notes: form.notes || null,
      created_by: 'staff',
    })

    setSaving(false)
    if (error) { toast.error('Erro ao guardar: ' + error.message); return }
    toast.success('Consulta agendada')
    setOpen(false)
    load()
  }

  async function handleStatusChange(id: string, status: string) {
    await supabase.from('appointments').update({ status }).eq('id', id)
    setEditOpen(false)
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('appointments').delete().eq('id', id)
    toast.success('Consulta eliminada')
    setEditOpen(false)
    load()
  }

  const filtered = professionalFilter === 'all'
    ? appointments
    : appointments.filter(a => a.professional_id === professionalFilter)

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const startPad = getDay(startOfMonth(currentMonth))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nova consulta</Button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold capitalize">{format(currentMonth, 'MMMM yyyy', { locale: pt })}</span>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Select value={professionalFilter} onValueChange={v => setProfessionalFilter(v ?? 'all')}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os profissionais</SelectItem>
            {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

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
            const dayAppointments = filtered.filter(a => isSameDay(new Date(a.scheduled_at), day))
            return (
              <div key={day.toISOString()} className="min-h-[90px] border-b border-r p-1.5">
                <p className="text-xs text-muted-foreground mb-1">{format(day, 'd')}</p>
                <div className="space-y-0.5">
                  {dayAppointments.map(a => (
                    <button
                      key={a.id}
                      onClick={() => { setSelected(a); setEditOpen(true) }}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-xs truncate ${statusColors[a.status]}`}
                    >
                      {format(new Date(a.scheduled_at), 'HH:mm')} {a.patients?.name}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova consulta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Paciente *</Label>
              <Select value={form.patient_id} onValueChange={v => setForm(f => ({ ...f, patient_id: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar paciente" /></SelectTrigger>
                <SelectContent>
                  {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Profissional</Label>
              <Select value={form.professional_id} onValueChange={v => setForm(f => ({ ...f, professional_id: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar profissional" /></SelectTrigger>
                <SelectContent>
                  {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data e hora</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  value={form.duration_minutes}
                  onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Procedimento</Label>
              <Input value={form.procedure} onChange={e => setForm(f => ({ ...f, procedure: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'A guardar...' : 'Agendar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selected?.patients?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div><span className="text-muted-foreground">Quando:</span> {selected && format(new Date(selected.scheduled_at), "dd MMM yyyy 'às' HH:mm", { locale: pt })}</div>
            <div><span className="text-muted-foreground">Profissional:</span> {selected?.professionals?.name ?? '—'}</div>
            <div><span className="text-muted-foreground">Procedimento:</span> {selected?.procedure ?? '—'}</div>
            {selected?.notes && <div><span className="text-muted-foreground">Notas:</span> {selected.notes}</div>}
            <div className="flex items-center gap-2">
              <Label className="text-xs">Estado:</Label>
              <Select value={selected?.status ?? 'scheduled'} onValueChange={v => { if (selected && v) handleStatusChange(selected.id, v) }}>
                <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Agendada</SelectItem>
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="no_show">Faltou (no-show)</SelectItem>
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
