import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Building2, Users, Plus, ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's communities
  const { data: memberships } = await supabase
    .from('community_members')
    .select(`
      id,
      role,
      community:communities (
        id,
        name,
        slug,
        description,
        type,
        logo_url,
        plan,
        status
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')

  interface CommunityWithRole {
    id: string
    name: string
    slug: string
    description: string | null
    type: string
    logo_url: string | null
    plan: string
    status: string
    role: string
  }

  const communities: CommunityWithRole[] = memberships
    ?.filter(m => m.community && typeof m.community === 'object' && !Array.isArray(m.community))
    .map(m => {
      const comm = m.community as unknown as Omit<CommunityWithRole, 'role'>
      return {
        ...comm,
        role: m.role,
      }
    }) || []

  // If user has exactly one community, redirect to it
  if (communities.length === 1) {
    redirect(`/c/${communities[0].id}`)
  }

  // Get member counts for each community
  const communityIds = communities.map(c => c.id)
  const { data: memberCounts } = communityIds.length > 0
    ? await supabase
        .from('community_members')
        .select('community_id')
        .in('community_id', communityIds)
        .eq('status', 'active')
    : { data: [] }

  const countMap = memberCounts?.reduce((acc, m) => {
    acc[m.community_id] = (acc[m.community_id] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  const typeLabels: Record<string, string> = {
    weg: 'WEG',
    house: 'House Community',
    neighborhood: 'Neighborhood',
    cohousing: 'Co-Housing',
    interest: 'Interest Group',
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your Communities</h1>
        <p className="text-muted-foreground mt-1">
          Select a community to view or manage
        </p>
      </div>

      {communities.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No communities yet</h2>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Create your own community or join an existing one using an invite link.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link href="/communities/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Community
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/communities/join">
                <Users className="mr-2 h-4 w-4" />
                Join Community
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {communities.map((community) => (
            <Link key={community.id} href={`/c/${community.id}`}>
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 rounded-xl">
                    {community.logo_url ? (
                      <AvatarImage src={community.logo_url} />
                    ) : null}
                    <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-xl">
                      {community.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-semibold truncate">{community.name}</h2>
                      {community.role === 'admin' && (
                        <Badge variant="secondary" className="text-xs">Admin</Badge>
                      )}
                      {community.role === 'moderator' && (
                        <Badge variant="outline" className="text-xs">Moderator</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {community.description || typeLabels[community.type] || community.type}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {countMap[community.id] || 0} members
                      </span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {community.plan}
                      </Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </Card>
            </Link>
          ))}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" asChild className="flex-1">
              <Link href="/communities/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Community
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/communities/join">
                <Users className="mr-2 h-4 w-4" />
                Join Community
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
