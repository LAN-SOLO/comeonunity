import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CommunityProvider } from '@/hooks/use-community'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <CommunityProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MobileNav />
        <main className="lg:pl-64">
          <div className="min-h-screen">
            {children}
          </div>
        </main>
      </div>
    </CommunityProvider>
  )
}
