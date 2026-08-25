import type Anthropic from '@anthropic-ai/sdk'
import { anthropic } from '@/lib/anthropic'
import { createAdminClient } from '@/lib/supabase/admin'

type SupabaseAdmin = ReturnType<typeof createAdminClient>

type AiReply = {
  reply: string
  intent: string
  needs_human: boolean
  priority: 'normal' | 'urgent'
}

const LANGUAGE_LABEL: Record<string, string> = { pt: 'português', en: 'inglês', es: 'espanhol' }
const FAQ_ANSWER_FIELD: Record<string, 'answer_pt' | 'answer_en' | 'answer_es'> = {
  pt: 'answer_pt',
  en: 'answer_en',
  es: 'answer_es',
}

async function buildFaqContext(supabase: SupabaseAdmin, language: string) {
  const { data: faqs } = await supabase
    .from('faqs')
    .select('question, category, answer_pt, answer_en, answer_es')
    .eq('active', true)

  const answerField = FAQ_ANSWER_FIELD[language] ?? 'answer_pt'

  return (faqs ?? [])
    .map(faq => {
      const answer = (faq as Record<string, string | null>)[answerField] ?? faq.answer_pt
      if (!answer) return null
      return `- [${faq.category ?? 'geral'}] P: ${faq.question}\n  R: ${answer}`
    })
    .filter(Boolean)
    .join('\n')
}

async function buildHoursContext(supabase: SupabaseAdmin) {
  const { data: professionals } = await supabase.from('professionals').select('id, name').eq('active', true)
  const { data: hours } = await supabase
    .from('clinic_hours')
    .select('professional_id, day_of_week, open_time, close_time, closed')

  const dayNames = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

  return (professionals ?? [])
    .map(prof => {
      const profHours = (hours ?? [])
        .filter(h => h.professional_id === prof.id)
        .sort((a, b) => a.day_of_week - b.day_of_week)
        .map(h => (h.closed ? `${dayNames[h.day_of_week]}: fechado` : `${dayNames[h.day_of_week]}: ${h.open_time}-${h.close_time}`))
        .join(', ')
      return profHours ? `- ${prof.name}: ${profHours}` : null
    })
    .filter(Boolean)
    .join('\n')
}

async function buildHistoryMessages(supabase: SupabaseAdmin, conversationId: string) {
  const { data: history } = await supabase
    .from('messages')
    .select('direction, sender, content, content_type')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(20)

  return (history ?? [])
    .filter(m => m.content_type === 'text' && m.content)
    .map(m => `[${m.direction === 'inbound' ? 'paciente' : m.sender ?? 'staff'}] ${m.content}`)
    .join('\n')
}

export async function generateAiReply(
  supabase: SupabaseAdmin,
  conversationId: string,
  patientId: string | null
): Promise<AiReply> {
  const { data: patient } = patientId
    ? await supabase.from('patients').select('name, preferred_language').eq('id', patientId).maybeSingle()
    : { data: null }

  const language = patient?.preferred_language ?? 'pt'

  const [faqContext, hoursContext, historyContext] = await Promise.all([
    buildFaqContext(supabase, language),
    buildHoursContext(supabase),
    buildHistoryMessages(supabase, conversationId),
  ])

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: `Você é o assistente de WhatsApp de uma clínica dentária. Responde a pacientes em nome da clínica.

Responde sempre em ${LANGUAGE_LABEL[language] ?? 'português'} (idioma preferido deste paciente).

Perguntas frequentes já aprovadas pela clínica (usa a resposta tal como está, sem parafrasear valores ou condições):
${faqContext || '(nenhuma FAQ cadastrada)'}

Horários de disponibilidade por profissional:
${hoursContext || '(nenhum horário cadastrado)'}

Regras obrigatórias de escalonamento (needs_human = true):
- Perguntas sobre preço/convénio que NÃO estejam cobertas por uma FAQ exata acima: nunca inventar valores, needs_human = true, e a reply é só uma confirmação breve de que a equipa vai responder.
- Qualquer menção a sintomas, dor, sangramento, infeção ou urgência: needs_human = true e priority = 'urgent'.
- Tom de reclamação ou insatisfação com o atendimento/cobrança: needs_human = true.
- Pedido para marcar, remarcar ou cancelar consulta: needs_human = true (a equipa trata do agendamento), a reply confirma que vão tratar disso.

Quando needs_human = true, a reply é SEMPRE curta (1-2 frases) e contém APENAS um reconhecimento empático e a confirmação de que a equipa da clínica vai contactar o paciente em breve. A reply NUNCA deve conter: sugestões de tratamento, conselhos de cuidados em casa, indicação de medicamentos, nem qualquer informação clínica — mesmo que pareça inofensiva. Isso é uma regra rígida: quem dá esse tipo de orientação é sempre um humano da equipa, nunca a IA.

Fora dessas situações, responde diretamente e de forma curta (estilo WhatsApp, sem formalidade excessiva), needs_human = false, priority = 'normal'.`,
    tool_choice: { type: 'tool', name: 'respond_to_patient' },
    tools: [{
      name: 'respond_to_patient',
      description: 'Envia a resposta ao paciente e classifica a conversa',
      input_schema: {
        type: 'object',
        properties: {
          reply: { type: 'string', description: 'Resposta a enviar ao paciente pelo WhatsApp' },
          intent: { type: 'string', description: 'Classificação curta da intenção da mensagem, ex: duvida_horario, preco, sintoma, agendamento, saudacao' },
          needs_human: { type: 'boolean', description: 'Se a conversa deve ser escalada para um humano' },
          priority: { type: 'string', enum: ['normal', 'urgent'], description: 'Prioridade da conversa' },
        },
        required: ['reply', 'intent', 'needs_human', 'priority'],
      },
    }],
    messages: [{
      role: 'user',
      content: `Histórico recente da conversa:\n${historyContext}\n\nResponde à última mensagem do paciente.`,
    }],
  })

  const toolUse = message.content.find(b => b.type === 'tool_use') as Anthropic.ToolUseBlock | undefined
  if (!toolUse) throw new Error('Sem resposta estruturada da IA')

  return toolUse.input as AiReply
}
