'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            <span style={{ color: 'var(--primary)' }}>pyme</span>tool
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>Defina a nova password</p>
        </div>

        <div className="rounded-2xl p-8 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 p-3 rounded-xl">{error}</p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Nova password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-11 rounded-xl border"
                style={{ background: 'var(--secondary)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                minLength={6}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 rounded-xl font-semibold mt-2"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
              disabled={loading}
            >
              {loading ? 'A guardar...' : 'Guardar nova password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
