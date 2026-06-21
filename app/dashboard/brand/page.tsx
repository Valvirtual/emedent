'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import Image from 'next/image'

export default function BrandPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    company_name: '',
    logo_url: '',
    primary_color: '#6366f1',
    industry: '',
    target_audience: 'b2c',
  })

  useEffect(() => {
    supabase.from('config').select('*').single().then(({ data }) => {
      if (data) setConfig(data)
    })
  }, [])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    const ext = file.name.split('.').pop()
    const path = `logo.${ext}`

    const { error } = await supabase.storage.from('brand').upload(path, file, { upsert: true })
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
    <div>
      <h1 className="text-2xl font-bold mb-6">Perfil de Marca</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Identidade da empresa</CardTitle>
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

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'A guardar...' : 'Guardar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
