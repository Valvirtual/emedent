'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import Image from 'next/image'

const TONES = [
  { value: 'profissional', label: 'Profissional e direto' },
  { value: 'descontraido', label: 'Descontraído e próximo' },
  { value: 'divertido', label: 'Divertido e informal' },
  { value: 'inspirador', label: 'Inspirador e motivador' },
  { value: 'formal', label: 'Formal e institucional' },
]

export default function BrandPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    company_name: '',
    logo_url: '',
    primary_color: '#8B2942',
    industry: '',
    target_audience: 'b2c',
    audience_detail: '',
    description: '',
    usp: '',
    tone_of_voice: 'profissional',
    location: '',
  })

  useEffect(() => {
    supabase.from('config').select('*').single().then(({ data }) => {
      if (data) setConfig(c => ({ ...c, ...data }))
    })
  }, [])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    const ext = file.name.split('.').pop()
    const path = `logo-${Date.now()}.${ext}`

    const { error } = await supabase.storage.from('brand').upload(path, file)
    if (error) {
      toast.error('Erro ao fazer upload do logo')
      setLoading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('brand').getPublicUrl(path)
    setConfig(c => ({ ...c, logo_url: publicUrl }))
    setLoading(false)
    toast.success('Logo carregado')
  }

  async function handleSave() {
    setSaving(true)
    const { data: existing } = await supabase.from('config').select('id').single()

    let error
    if (existing) {
      ({ error } = await supabase.from('config').update(config).eq('id', existing.id))
    } else {
      ({ error } = await supabase.from('config').insert(config))
    }

    setSaving(false)
    if (error) toast.error('Erro ao guardar')
    else toast.success('Configurações guardadas')
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">Perfil de Marca</h1>

      <Card>
        <CardHeader>
          <CardTitle>Identidade visual</CardTitle>
          <CardDescription>Logo e cor usados nos materiais gerados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              {config.logo_url && (
                <Image src={config.logo_url} alt="Logo" width={64} height={64} className="rounded-md object-contain border" />
              )}
              <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={loading} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Cor principal</Label>
            <div className="flex items-center gap-3">
              <input
                id="color"
                type="color"
                value={config.primary_color}
                onChange={e => setConfig(c => ({ ...c, primary_color: e.target.value }))}
                className="w-10 h-10 rounded cursor-pointer border"
              />
              <Input
                value={config.primary_color}
                onChange={e => setConfig(c => ({ ...c, primary_color: e.target.value }))}
                className="w-32 font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>O negócio</CardTitle>
          <CardDescription>Quanto mais específico, melhor o conteúdo gerado pela IA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="company_name">Nome da empresa</Label>
            <Input
              id="company_name"
              value={config.company_name}
              onChange={e => setConfig(c => ({ ...c, company_name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Sector</Label>
            <Input
              id="industry"
              placeholder="ex: Restauração, Saúde, Tecnologia..."
              value={config.industry}
              onChange={e => setConfig(c => ({ ...c, industry: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">O que a empresa faz?</Label>
            <Textarea
              id="description"
              placeholder="Resuma em 1-2 frases o produto/serviço e o problema que resolve para o cliente"
              value={config.description}
              onChange={e => setConfig(c => ({ ...c, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usp">O que vos torna diferentes da concorrência?</Label>
            <Textarea
              id="usp"
              placeholder="ex: Entrega em 24h, preços fixos sem surpresas, 15 anos de experiência no setor..."
              value={config.usp}
              onChange={e => setConfig(c => ({ ...c, usp: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Área de atuação</Label>
            <Input
              id="location"
              placeholder="ex: Lisboa e Grande Lisboa, Portugal inteiro, online..."
              value={config.location}
              onChange={e => setConfig(c => ({ ...c, location: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Público e comunicação</CardTitle>
          <CardDescription>Define como a IA deve falar com o seu cliente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="target_audience">Público-alvo</Label>
            <Select
              value={config.target_audience}
              onValueChange={v => setConfig(c => ({ ...c, target_audience: v ?? 'b2c' }))}
            >
              <SelectTrigger id="target_audience"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="b2c">Consumidor final (B2C)</SelectItem>
                <SelectItem value="b2b">Outras empresas / profissionais (B2B)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="audience_detail">Quem é especificamente o seu cliente?</Label>
            <Textarea
              id="audience_detail"
              placeholder="ex: Hotéis de 3-5 estrelas na região de Lisboa; ou Mães entre 30-45 anos que valorizam produtos naturais"
              value={config.audience_detail}
              onChange={e => setConfig(c => ({ ...c, audience_detail: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tone_of_voice">Tom de voz</Label>
            <Select
              value={config.tone_of_voice}
              onValueChange={v => setConfig(c => ({ ...c, tone_of_voice: v ?? 'profissional' }))}
            >
              <SelectTrigger id="tone_of_voice"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TONES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'A guardar...' : 'Guardar'}
      </Button>
    </div>
  )
}
