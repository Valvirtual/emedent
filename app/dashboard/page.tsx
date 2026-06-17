import { createClient } from '@/lib/supabase/server'
import { Calendar, Users, FileText, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ count: posts }, { count: contacts }, { count: quotes }] = await Promise.all([
    supabase.from('content_posts').select('*', { count: 'exact', head: true }),
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('quotes').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Posts agendados', value: posts ?? 0, sub: 'No calendário', icon: Calendar, color: 'bg-violet-500' },
    { label: 'Contactos', value: contacts ?? 0, sub: 'No CRM', icon: Users, color: 'bg-blue-500' },
    { label: 'Orçamentos', value: quotes ?? 0, sub: 'Criados', icon: FileText, color: 'bg-emerald-500' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Bom dia 👋</h1>
        <p className="text-muted-foreground mt-1">Aqui está o resumo da sua actividade.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
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
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Primeiros passos</h2>
        </div>
        <div className="space-y-2 mt-4">
          {[
            { step: '1', text: 'Configure o perfil da marca em Marca', done: false },
            { step: '2', text: 'Adicione os primeiros contactos no CRM', done: false },
            { step: '3', text: 'Gere um orçamento com IA', done: false },
            { step: '4', text: 'Crie posts no Calendário de Conteúdo', done: false },
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
