import { anthropic } from '@/lib/anthropic'
import { NextRequest, NextResponse } from 'next/server'

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
    messages: [{
      role: 'user',
      content: `Cria um post para ${platform} para a empresa "${companyName}" do sector "${industry || 'geral'}".

Tema: ${topic}
Tom: ${tone || 'profissional e envolvente'}
Limite: ${constraint}

Retorna APENAS um JSON:
{
  "title": "título curto do post",
  "body": "texto do post pronto a publicar"
}`
    }]
  })

  const raw = (message.content[0] as { text: string }).text
  const json = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim())

  return NextResponse.json(json)
}
