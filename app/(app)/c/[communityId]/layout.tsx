import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface Props {
  children: React.ReactNode
  params: Promise<{ communityId: string }>
}

export default async function CommunityLayout({ children, params }: Props) {
  const { communityId: slugOrId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if the value looks like a UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId)

  // Find community by slug or ID (only check ID if it looks like a UUID)
  let communityQuery = supabase
    .from('communities')
    .select('id, slug, status')
    .eq('status', 'active')

  if (isUUID) {
    communityQuery = communityQuery.or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
  } else {
    communityQuery = communityQuery.eq('slug', slugOrId)
  }

  const { data: community } = await communityQuery.single()

  if (!community) {
    notFound()
  }

  // Redirect to canonical slug URL if accessed by ID
  if (slugOrId !== community.slug && slugOrId === community.id) {
    redirect(`/c/${community.slug}`)
  }

  // Verify user is a member of this community
  const { data: membership } = await supabase
    .from('community_members')
    .select('id, status')
    .eq('community_id', community.id)
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
