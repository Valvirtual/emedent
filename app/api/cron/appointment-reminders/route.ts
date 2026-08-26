import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppTemplate } from '@/lib/whatsapp'
import { format } from 'date-fns'

// Templates de lembrete precisam ser pré-aprovados pelo Meta, um por idioma (mesmo nome,
// language code diferente). Ajustar os codes abaixo conforme o que for submetido no Meta Business Manager.
const TEMPLATE_NAME = 'lembrete_consulta'
const LANGUAGE_CODES: Record<string, string> = { pt: 'pt_BR', en: 'en_US', es: 'es_ES' }

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Cron corre 1x/dia (limite do plano Hobby da Vercel), por isso a janela cobre
  // as próximas 24-48h inteiras para apanhar todas as consultas do dia seguinte
  // numa única execução, em vez de uma janela estreita pensada para cron horário.
  const now = new Date()
  const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
  const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, scheduled_at, procedure, patient_id, patients(name, phone, preferred_language)')
    .gte('scheduled_at', windowStart)
    .lte('scheduled_at', windowEnd)
    .in('status', ['scheduled', 'confirmed'])
    .is('reminder_sent_at', null)

  let sent = 0
  for (const appt of appointments ?? []) {
    const patient = appt.patients as unknown as { name: string; phone: string; preferred_language: string } | null
    if (!patient?.phone) continue

    const languageCode = LANGUAGE_CODES[patient.preferred_language] ?? LANGUAGE_CODES.pt
    const when = format(new Date(appt.scheduled_at), 'dd/MM/yyyy HH:mm')

    try {
      await sendWhatsAppTemplate(patient.phone, TEMPLATE_NAME, languageCode, [patient.name, when])
      await supabase.from('appointments').update({ reminder_sent_at: new Date().toISOString() }).eq('id', appt.id)
      sent++
    } catch (err) {
      console.error(`Falha ao enviar lembrete para consulta ${appt.id}:`, err)
    }
  }

  return NextResponse.json({ ok: true, sent })
}
