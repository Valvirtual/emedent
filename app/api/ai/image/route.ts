import { replicate } from '@/lib/replicate'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

const IMAGE_MODEL = 'black-forest-labs/flux-schnell'

export async function POST(req: NextRequest) {
  const { topic, body, industry, tone, primaryColor, companyName } = await req.json()

  const prompt = `Social media post image for "${companyName}" (${industry || 'general'} industry).
Topic: ${topic}. Mood/tone: ${tone || 'professional and engaging'}.
Context: ${body || ''}
Style: clean, modern, high-quality marketing photography, no text or logos overlaid, accent color ${primaryColor || '#6366f1'}.`

  const output = await replicate.run(IMAGE_MODEL, {
    input: { prompt, aspect_ratio: '1:1' },
  }) as unknown as { url: () => URL }[]

  const imageOutput = Array.isArray(output) ? output[0] : output
  if (!imageOutput) return NextResponse.json({ error: 'Sem resposta da IA' }, { status: 502 })

  const imageResponse = await fetch(imageOutput.url().toString())
  const imageBuffer = await imageResponse.arrayBuffer()

  const supabase = await createClient()
  const path = `${randomUUID()}.webp`
  const { error } = await supabase.storage.from('post-media').upload(path, imageBuffer, {
    contentType: 'image/webp',
  })
  if (error) {
    console.error('Erro ao guardar imagem no storage:', error)
    return NextResponse.json({ error: 'Erro ao guardar imagem' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(path)
  return NextResponse.json({ image_url: publicUrl })
}
