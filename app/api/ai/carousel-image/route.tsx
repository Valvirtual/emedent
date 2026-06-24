import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'crypto'

const SIZE = 1080

export async function POST(req: NextRequest) {
  const { slides, primaryColor, companyName } = await req.json()

  if (!Array.isArray(slides) || slides.length === 0) {
    return NextResponse.json({ error: 'Sem slides para gerar' }, { status: 400 })
  }

  const [interRegular, interBold] = await Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/Inter-Regular.ttf')),
    readFile(join(process.cwd(), 'assets/fonts/Inter-Bold.ttf')),
  ])

  const supabase = await createClient()
  const carousel_urls: string[] = []

  for (let i = 0; i < slides.length; i++) {
    const heading: string = slides[i].heading ?? ''

    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: primaryColor || '#6366f1',
            backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 100%)',
            padding: '80px',
          }}
        >
          <div
            style={{
              fontFamily: 'Inter',
              fontWeight: 700,
              fontSize: 76,
              lineHeight: 1.2,
              color: 'white',
              textAlign: 'center',
            }}
          >
            {heading}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 50,
              display: 'flex',
              width: '100%',
              justifyContent: 'space-between',
              paddingLeft: 60,
              paddingRight: 60,
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 28,
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            <div>{companyName}</div>
            <div>{`${i + 1}/${slides.length}`}</div>
          </div>
        </div>
      ),
      {
        width: SIZE,
        height: SIZE,
        fonts: [
          { name: 'Inter', data: interRegular, weight: 400, style: 'normal' },
          { name: 'Inter', data: interBold, weight: 700, style: 'normal' },
        ],
      }
    )

    const buffer = Buffer.from(await imageResponse.arrayBuffer())
    const path = `${randomUUID()}.png`
    const { error } = await supabase.storage.from('post-media').upload(path, buffer, {
      contentType: 'image/png',
    })
    if (error) {
      console.error('Erro ao guardar slide no storage:', error)
      return NextResponse.json({ error: 'Erro ao guardar slide' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(path)
    carousel_urls.push(publicUrl)
  }

  return NextResponse.json({ carousel_urls })
}
