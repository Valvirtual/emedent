import { anthropic } from '@/lib/anthropic'
import { NextRequest, NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const { clientName, services, notes, companyName, industry } = await req.json()

  const servicesList = services.join(', ')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    tool_choice: { type: 'tool', name: 'create_quote' },
    tools: [{
      name: 'create_quote',
      description: 'Cria uma proposta comercial com valores e detalhe de serviços',
      input_schema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Texto completo da proposta' },
          total: { type: 'number', description: 'Total em euros' },
          breakdown: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                service: { type: 'string' },
                price: { type: 'number' },
              },
              required: ['service', 'price'],
            },
          },
        },
        required: ['content', 'total', 'breakdown'],
      },
    }],
    messages: [{
      role: 'user',
      content: `És um assistente profissional de vendas para a empresa "${companyName}" do sector "${industry || 'geral'}".

Cria uma proposta comercial profissional em português para:
- Cliente: ${clientName}
- Serviços solicitados: ${servicesList}
- Observações: ${notes || 'Nenhuma'}

A proposta deve incluir:
1. Saudação personalizada
2. Apresentação breve da empresa
3. Descrição dos serviços com valor percebido
4. Estimativa de investimento total (cria valores realistas baseados nos serviços)
5. Próximos passos
6. Fecho profissional`
    }]
  })

  const toolUse = message.content.find(b => b.type === 'tool_use') as Anthropic.ToolUseBlock | undefined
  if (!toolUse) return NextResponse.json({ error: 'Sem resposta da IA' }, { status: 502 })

  return NextResponse.json(toolUse.input)
}
