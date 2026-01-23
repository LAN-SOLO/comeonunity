import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LandingContent } from '@/components/landing/landing-content'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If logged in, redirect to app
  if (user) {
    const { data: memberships } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)

    if (memberships && memberships.length > 0) {
      redirect(`/c/${memberships[0].community_id}`)
    } else {
      redirect('/communities/new')
    }
  }

  return <LandingContent />
}
