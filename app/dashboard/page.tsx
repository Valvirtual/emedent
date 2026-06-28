import { createClient } from '@/lib/supabase/server'
import { MessageCircle, Users, CalendarClock, AlertTriangle } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ count: patients }, { count: appointments }, { count: needsHuman }, { count: urgent }] = await Promise.all([
    supabase.from('patients').select('*', { count: 'exact', head: true }),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('scheduled_at', new Date().toISOString()).in('status', ['scheduled', 'confirmed']),
    supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('status', 'needs_human'),
    supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('priority', 'urgent'),
  ])

  const stats = [
    { label: 'Pacientes', value: patients ?? 0, sub: 'Cadastrados', icon: Users, color: 'bg-blue-500' },
    { label: 'Próximas consultas', value: appointments ?? 0, sub: 'Agendadas', icon: CalendarClock, color: 'bg-emerald-500' },
    { label: 'Precisam de humano', value: needsHuman ?? 0, sub: 'Na inbox', icon: MessageCircle, color: 'bg-violet-500' },
    { label: 'Urgentes', value: urgent ?? 0, sub: 'Prioridade alta', icon: AlertTriangle, color: 'bg-red-500' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Bom dia 👋</h1>
        <p className="text-muted-foreground mt-1">Aqui está o resumo do atendimento da clínica.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 mb-8">
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Primeiros passos</h2>
        </div>
        <div className="space-y-2 mt-4">
          {[
            { step: '1', text: 'Configure o perfil da clínica em Marca' },
            { step: '2', text: 'Cadastre os profissionais (dentistas) da clínica' },
            { step: '3', text: 'Adicione os primeiros pacientes' },
            { step: '4', text: 'Configure o webhook do WhatsApp para começar a receber mensagens na Inbox' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-center gap-3 py-2">
              <div className="w-6 h-6 rounded-full border-2 border-primary/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">{step}</span>
              </div>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
