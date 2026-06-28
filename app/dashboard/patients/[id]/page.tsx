import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import PatientActions from './patient-actions'
import PatientMedia from './patient-media'

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-gray-100 text-gray-800',
  no_show: 'bg-yellow-100 text-yellow-800',
}

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: patient } = await supabase.from('patients').select('*').eq('id', id).maybeSingle()
  if (!patient) notFound()

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, professionals(name)')
    .eq('patient_id', id)
    .order('scheduled_at', { ascending: false })

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, status, priority, last_message_at')
    .eq('patient_id', id)
    .order('last_message_at', { ascending: false })

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/dashboard/patients" className="text-sm text-muted-foreground hover:underline flex items-center gap-1 mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Pacientes
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{patient.name}</h1>
          <PatientActions patientId={patient.id} patientName={patient.name} />
        </div>
      </div>

      <div className="bg-white rounded-lg border p-5 grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-muted-foreground">Telefone</span><div className="font-medium">{patient.phone}</div></div>
        <div><span className="text-muted-foreground">Email</span><div className="font-medium">{patient.email || '—'}</div></div>
        <div><span className="text-muted-foreground">Data de nascimento</span><div className="font-medium">{patient.birth_date || '—'}</div></div>
        <div><span className="text-muted-foreground">Convénio/seguro</span><div className="font-medium">{patient.insurance_provider || '—'}</div></div>
        <div><span className="text-muted-foreground">Próximo retorno</span><div className="font-medium">{patient.next_followup_date || '—'}</div></div>
        <div><span className="text-muted-foreground">Idioma preferido</span><div className="font-medium">{patient.preferred_language}</div></div>
        <div><span className="text-muted-foreground">Consentimento (GDPR)</span><div className="font-medium">{patient.consent_given_at ? new Date(patient.consent_given_at).toLocaleString() : 'Não registado'}</div></div>
        {patient.medical_history && (
          <div className="col-span-2"><span className="text-muted-foreground">Histórico médico</span><div className="font-medium">{patient.medical_history}</div></div>
        )}
        {patient.clinical_notes && (
          <div className="col-span-2"><span className="text-muted-foreground">Observações clínicas</span><div className="font-medium">{patient.clinical_notes}</div></div>
        )}
      </div>

      <div className="bg-white rounded-lg border">
        <div className="px-5 py-3 border-b font-medium text-sm">Consultas</div>
        {!appointments?.length ? (
          <div className="px-5 py-6 text-sm text-muted-foreground">Sem consultas registadas</div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {appointments.map(a => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="px-5 py-3">{new Date(a.scheduled_at).toLocaleString()}</td>
                  <td className="px-5 py-3 text-muted-foreground">{a.professionals?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-muted-foreground">{a.procedure || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[a.status] ?? ''}`}>{a.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-lg border">
        <div className="px-5 py-3 border-b font-medium text-sm">Conversas</div>
        {!conversations?.length ? (
          <div className="px-5 py-6 text-sm text-muted-foreground">Sem conversas registadas</div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {conversations.map(c => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-5 py-3">{new Date(c.last_message_at).toLocaleString()}</td>
                  <td className="px-5 py-3 text-muted-foreground">{c.status}</td>
                  <td className="px-5 py-3">
                    {c.priority === 'urgent' && <Badge className="bg-red-100 text-red-700">URGENTE</Badge>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href="/dashboard/inbox" className="text-xs text-primary hover:underline">Ver na inbox</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PatientMedia patientId={patient.id} />
    </div>
  )
}
