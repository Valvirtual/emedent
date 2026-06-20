'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            <span style={{ color: 'var(--primary)' }}>pyme</span>tool
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>Recuperar password</p>
        </div>

        <div className="rounded-2xl p-8 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          {sent ? (
            <p className="text-sm" style={{ color: 'var(--foreground)' }}>
              Se existir uma conta com este email, foi enviado um link para repor a password. Verifique a sua caixa de entrada.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 p-3 rounded-xl">{error}</p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@empresa.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-11 rounded-xl border"
                  style={{ background: 'var(--secondary)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 rounded-xl font-semibold mt-2"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                disabled={loading}
              >
                {loading ? 'A enviar...' : 'Enviar link de recuperação'}
              </Button>
            </form>
          )}
        </div>

        <p className="text-sm text-center mt-5" style={{ color: 'var(--muted-foreground)' }}>
          <Link href="/login" className="font-medium hover:underline" style={{ color: 'var(--primary)' }}>
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  )
}
