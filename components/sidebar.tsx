'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, Calendar, Users, FileText, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/calendar', label: 'Calendário', icon: Calendar },
  { href: '/dashboard/crm', label: 'CRM', icon: Users },
  { href: '/dashboard/quotes', label: 'Orçamentos', icon: FileText },
  { href: '/dashboard/brand', label: 'Marca', icon: Settings },
]

export default function Sidebar({ companyName, logoUrl }: { companyName: string; logoUrl?: string | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-60 flex flex-col border-r" style={{ background: 'var(--sidebar)', borderColor: 'var(--sidebar-border)' }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <Image src={logoUrl} alt="Logo" width={32} height={32} className="rounded-lg object-contain" />
          ) : (
            <span className="text-lg font-bold" style={{ color: 'var(--sidebar-foreground)' }}>
              <span style={{ color: 'var(--primary)' }}>pyme</span>tool
            </span>
          )}
          {logoUrl && (
            <span className="font-semibold text-sm truncate" style={{ color: 'var(--sidebar-foreground)' }}>{companyName}</span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              )}
              style={active
                ? { background: 'var(--primary)', color: 'var(--primary-foreground)' }
                : { color: 'var(--muted-foreground)' }
              }
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-foreground)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)' }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-6 pt-3 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-all duration-150"
          style={{ color: 'var(--muted-foreground)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-foreground)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'}
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
