import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: config } = await supabase
    .from('config')
    .select('company_name, logo_url, primary_color')
    .single()

  const primaryColor = config?.primary_color || '#8B2942'

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ '--primary': primaryColor, '--primary-foreground': '#ffffff' } as React.CSSProperties}
    >
      <Sidebar companyName={config?.company_name ?? 'pymetool'} logoUrl={config?.logo_url} />
      <main className="flex-1 overflow-auto bg-background p-8">
        {children}
      </main>
    </div>
  )
}
