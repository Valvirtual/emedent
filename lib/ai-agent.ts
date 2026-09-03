import type Anthropic from '@anthropic-ai/sdk'
import { anthropic } from '@/lib/anthropic'
import { createAdminClient } from '@/lib/supabase/admin'

type SupabaseAdmin = ReturnType<typeof createAdminClient>

type AiReply = {
  reply: string
  intent: string
  needs_human: boolean
  priority: 'normal' | 'urgent'
  detected_language: 'pt' | 'en' | 'es'
}

const LANGUAGE_LABEL: Record<string, string> = {
  pt: 'português do Brasil (PT-BR) — usa "você", nunca vocabulário ou construções tipicamente de Portugal',
  en: 'inglês',
  es: 'español de España (castellano) — a conversa é sempre com UM único paciente, então usa "tú" (singular informal), nunca "vosotros" (é plural, só para grupos) nem latino-americanismos',
}

async function buildFaqContext(supabase: SupabaseAdmin) {
  const { data: faqs } = await supabase
    .from('faqs')
    .select('question, category, answer_pt, answer_en, answer_es')
    .eq('active', true)

  return (faqs ?? [])
    .map(faq => {
      const variants = [
        faq.answer_pt ? `PT: ${faq.answer_pt}` : null,
        faq.answer_en ? `EN: ${faq.answer_en}` : null,
        faq.answer_es ? `ES: ${faq.answer_es}` : null,
      ].filter(Boolean).join(' | ')
      if (!variants) return null
      return `- [${faq.category ?? 'geral'}] P: ${faq.question}\n  ${variants}`
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
  patientId: string | null,
  isNewConversation: boolean
): Promise<AiReply> {
  const { data: patient } = patientId
    ? await supabase.from('patients').select('name, preferred_language').eq('id', patientId).maybeSingle()
    : { data: null }

  const fallbackLanguage = patient?.preferred_language ?? 'pt'

  const [faqContext, hoursContext, historyContext, config] = await Promise.all([
    buildFaqContext(supabase),
    buildHoursContext(supabase),
    buildHistoryMessages(supabase, conversationId),
    supabase.from('config').select('company_name, assistant_name').maybeSingle().then(r => r.data),
  ])

  const clinicName = config?.company_name ?? 'a clínica'
  const assistantName = config?.assistant_name?.trim() || null

  const disclosureTemplates = assistantName
    ? {
        pt: `Olá! Sou ${assistantName}, assistente virtual com IA de ${clinicName}.`,
        es: `¡Hola! Soy ${assistantName}, asistente virtual con IA de ${clinicName}.`,
        en: `Hi! I'm ${assistantName}, a virtual AI assistant for ${clinicName}.`,
      }
    : {
        pt: `Olá! Sou o assistente virtual com IA de ${clinicName}.`,
        es: `¡Hola! Soy el asistente virtual con IA de ${clinicName}.`,
        en: `Hi! I'm the virtual AI assistant for ${clinicName}.`,
      }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: `Você é${assistantName ? ` ${assistantName},` : ''} o assistente de WhatsApp de ${clinicName}. Responde a pacientes em nome da clínica.

${isNewConversation
  ? `Esta é a PRIMEIRA mensagem desta conversa. Por obrigação legal (Art. 50 do EU AI Act, transparência de sistemas de IA), a reply tem de começar EXATAMENTE por uma destas frases de identificação, conforme o idioma detectado (nunca omitir "IA" ou equivalente — não basta dizer "assistente virtual", tem de ficar claro que é IA; usa a frase tal como está, não a reescrevas):
- PT: "${disclosureTemplates.pt}"
- ES: "${disclosureTemplates.es}"
- EN: "${disclosureTemplates.en}"

A seguir a essa frase (mesma mensagem): se o paciente já fez uma pergunta específica, responde-a diretamente; se foi só uma saudação sem pergunta, pergunta "Em que posso ajudar?" (traduzido).`
  : `Esta NÃO é a primeira mensagem da conversa — já te identificaste como IA antes. NÃO repitas essa identificação, responde diretamente.`}

Tom: cordial e próximo, mas sóbrio — como uma rececionista atenciosa, não como uma promoção. Nunca uses emojis (nenhum, em nenhuma resposta). Evita pontos de exclamação e entusiasmo exagerado; frases diretas e calmas transmitem mais confiança numa clínica do que efusividade.

Detecta o idioma em que o paciente está a escrever, a partir da mensagem mais recente dele no histórico, e responde SEMPRE nesse mesmo idioma. Se não houver sinal claro (ex: primeira mensagem é só um emoji), usa ${LANGUAGE_LABEL[fallbackLanguage] ?? LANGUAGE_LABEL.pt} como padrão. Devolve o idioma detectado no campo detected_language ('pt', 'en' ou 'es').

Variantes regionais obrigatórias, independentemente de qual idioma for detectado:
- Português: ${LANGUAGE_LABEL.pt}
- Espanhol: ${LANGUAGE_LABEL.es}

Perguntas frequentes já aprovadas pela clínica, com a resposta pré-traduzida em PT/EN/ES — usa sempre a versão já traduzida no idioma detectado, nunca traduzas o texto tu mesma (evita erro de tradução em informação sensível):
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
          detected_language: { type: 'string', enum: ['pt', 'en', 'es'], description: 'Idioma detectado na mensagem do paciente' },
        },
        required: ['reply', 'intent', 'needs_human', 'priority', 'detected_language'],
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
