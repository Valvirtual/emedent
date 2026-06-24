import { anthropic } from '@/lib/anthropic'
import { NextRequest, NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'

const SLIDE_COUNT = 5

export async function POST(req: NextRequest) {
  const { topic, platform, tone, companyName, industry, targetAudience, audienceDetail, description, usp, location } = await req.json()

  const audienceRules = targetAudience === 'b2b'
    ? `Público-alvo: outras empresas/profissionais (B2B) — ex: hotéis, condomínios, empresas, não o consumidor final.
- Dirija-se ao decisor da empresa (gestor, diretor, responsável), nunca como se fosse a um consumidor individual.
- Foque-se em benefícios de negócio: fiabilidade, eficiência, redução de custos/tempo, conformidade, capacidade de resposta — não em desejo pessoal ou impulso de compra.
- CTA orientado a negócio: pedir contacto comercial, agendar reunião, solicitar proposta.`
    : `Público-alvo: consumidor final (B2C).
- Escreva para uma pessoa, não para uma multidão (use "tu/você", nunca "caros clientes").
- CTA orientado ao consumidor: comentar, visitar, marcar, comprar.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 768,
    system: `Você é copywriter sénior especializado em carrosséis de redes sociais para pequenas e médias empresas.

${audienceRules}

Regras para o carrossel (${SLIDE_COUNT} slides):
- Slide 1: o gancho (hook) — pergunta, dado surpreendente ou dor do cliente, capta atenção em 3-6 palavras.
- Slides intermédios: um ponto de valor por slide, frase curta e direta (máx. 8-10 palavras), nada de frases completas longas.
- Último slide: chamada à ação clara e específica (ex: "Contacte-nos esta semana"), nunca genérica como "saiba mais".
- O texto de cada slide ("heading") tem de ser curto porque vai aparecer grande, centrado, numa imagem — não é uma frase de legenda.
- A "caption" é o texto completo do post (a legenda que acompanha o carrossel no Instagram/LinkedIn), com mais contexto e hashtags relevantes, seguindo as mesmas regras de copy de um post normal.
- Evite clichês de marketing ("solução inovadora", "líder de mercado").
- Adapte vocabulário ao setor indicado.`,
    tool_choice: { type: 'tool', name: 'create_carousel' },
    tools: [{
      name: 'create_carousel',
      description: 'Cria a legenda e os slides de um carrossel para redes sociais',
      input_schema: {
        type: 'object',
        properties: {
          caption: { type: 'string', description: 'Legenda completa do post, pronta a publicar, com hashtags' },
          slides: {
            type: 'array',
            description: `Exatamente ${SLIDE_COUNT} slides, do gancho ao CTA`,
            items: {
              type: 'object',
              properties: {
                heading: { type: 'string', description: 'Texto curto e direto do slide (poucas palavras)' },
              },
              required: ['heading'],
            },
          },
        },
        required: ['caption', 'slides'],
      },
    }],
    messages: [{
      role: 'user',
      content: `Cria um carrossel de ${SLIDE_COUNT} slides para ${platform} para a empresa "${companyName}" do sector "${industry || 'geral'}".
${description ? `O que a empresa faz: ${description}` : ''}
${usp ? `Diferencial da empresa: ${usp}` : ''}
${audienceDetail ? `Cliente específico: ${audienceDetail}` : ''}
${location ? `Área de atuação: ${location}` : ''}

Tema: ${topic}
Tom: ${tone || 'profissional e envolvente'}`
    }]
  })

  const toolUse = message.content.find(b => b.type === 'tool_use') as Anthropic.ToolUseBlock | undefined
  if (!toolUse) return NextResponse.json({ error: 'Sem resposta da IA' }, { status: 502 })

  return NextResponse.json(toolUse.input)
}
