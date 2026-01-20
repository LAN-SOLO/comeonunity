import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface Props {
  children: React.ReactNode
  params: Promise<{ communityId: string }>
}

export default async function CommunityLayout({ children, params }: Props) {
  const { communityId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verify user is a member of this community
  const { data: membership } = await supabase
    .from('community_members')
    .select('id, status')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    notFound()
  }

  if (membership.status === 'suspended') {
    redirect('/suspended')
  }

  if (membership.status !== 'active') {
    redirect('/')
  }

  // Update last_active_at
  await supabase
    .from('community_members')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', membership.id)

  return <>{children}</>
}
