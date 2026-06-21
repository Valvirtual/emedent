import { anthropic } from '@/lib/anthropic'
import { NextRequest, NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const { topic, platform, tone, companyName, industry, targetAudience } = await req.json()

  const limits: Record<string, string> = {
    instagram: '2200 caracteres, use hashtags relevantes (5-10), tom visual',
    linkedin: '1300 caracteres, tom profissional, sem hashtags excessivas',
    facebook: '1000 caracteres, tom conversacional',
    tiktok: '150 caracteres de legenda, gancho forte no início',
    twitter: '280 caracteres máximo, directo ao ponto',
  }

  const constraint = limits[platform] ?? '500 caracteres'

  const audienceRules = targetAudience === 'b2b'
    ? `Público-alvo: outras empresas/profissionais (B2B) — ex: hotéis, condomínios, empresas, não o consumidor final.
- Dirija-se ao decisor da empresa (gestor, diretor, responsável), nunca como se fosse a um consumidor individual.
- Foque-se em benefícios de negócio: fiabilidade, eficiência, redução de custos/tempo, conformidade, capacidade de resposta — não em desejo pessoal ou impulso de compra.
- Tom mais formal e direto; gatilhos emocionais de consumo pessoal não se aplicam aqui.
- CTA orientado a negócio: pedir contacto comercial, agendar reunião, solicitar proposta — nunca "compra já" ou "visita a loja".`
    : `Público-alvo: consumidor final (B2C).
- Escreva para uma pessoa, não para uma multidão (use "tu/você", nunca "caros clientes").
- CTA orientado ao consumidor: comentar, visitar, marcar, comprar.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: `Você é copywriter sénior especializado em redes sociais para pequenas e médias empresas.

${audienceRules}

Regras de copy a seguir sempre:
- Primeira linha é um gancho (hook): pergunta, dado surpreendente, dor do cliente/empresa ou afirmação que capte atenção — nunca comece pelo nome da empresa ou "Hoje vamos falar sobre".
- Use frases curtas e quebras de linha frequentes; evite parágrafos densos.
- Termine sempre com uma chamada à ação clara e específica — nunca um CTA genérico como "saiba mais".
- Evite clichês de marketing ("solução inovadora", "qualidade superior", "líder de mercado", "a melhor opção do mercado").
- Use no máximo 1-2 emojis, só se fizerem sentido para a plataforma, o tom pedido e o público-alvo.
- Adapte vocabulário ao setor indicado, sem jargão técnico desnecessário.`,
    tool_choice: { type: 'tool', name: 'create_post' },
    tools: [{
      name: 'create_post',
      description: 'Cria o título e o corpo de um post para redes sociais',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Título curto do post' },
          body: { type: 'string', description: 'Texto do post pronto a publicar' },
        },
        required: ['title', 'body'],
      },
    }],
    messages: [{
      role: 'user',
      content: `Cria um post para ${platform} para a empresa "${companyName}" do sector "${industry || 'geral'}".

Tema: ${topic}
Tom: ${tone || 'profissional e envolvente'}
Limite: ${constraint}`
    }]
  })

  const toolUse = message.content.find(b => b.type === 'tool_use') as Anthropic.ToolUseBlock | undefined
  if (!toolUse) return NextResponse.json({ error: 'Sem resposta da IA' }, { status: 502 })

  return NextResponse.json(toolUse.input)
}
