import { anthropic } from '@/lib/anthropic'
import { NextRequest, NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const { topic, platform, tone, companyName, industry } = await req.json()

  const limits: Record<string, string> = {
    instagram: '2200 caracteres, use hashtags relevantes (5-10), tom visual',
    linkedin: '1300 caracteres, tom profissional, sem hashtags excessivas',
    facebook: '1000 caracteres, tom conversacional',
    tiktok: '150 caracteres de legenda, gancho forte no início',
    twitter: '280 caracteres máximo, directo ao ponto',
  }

  const constraint = limits[platform] ?? '500 caracteres'

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
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
