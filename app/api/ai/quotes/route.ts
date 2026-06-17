import { anthropic } from '@/lib/anthropic'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { clientName, services, notes, companyName, industry } = await req.json()

  const servicesList = services.join(', ')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
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
6. Fecho profissional

Retorna APENAS um JSON com este formato:
{
  "content": "texto completo da proposta",
  "total": número total em euros,
  "breakdown": [{"service": "nome", "price": número}]
}`
    }]
  })

  const raw = (message.content[0] as { text: string }).text
  const json = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim())

  return NextResponse.json(json)
}
