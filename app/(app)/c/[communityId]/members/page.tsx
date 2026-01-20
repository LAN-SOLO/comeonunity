'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MemberCard } from '@/components/members/member-card'
import { SkillsFilter } from '@/components/members/skills-filter'
import {
  Search,
  Users,
  Grid3X3,
  List,
  Loader2,
  UserPlus,
  Sparkles,
} from 'lucide-react'

interface Member {
  id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  unit_number: string | null
  phone: string | null
  show_phone: boolean
  show_email: boolean
  email?: string
  skills: string[] | null
  skills_description: string | null
  available_for_help: boolean
  role: string
  joined_at: string
  user: {
    email: string
  } | null
}

export default function MembersPage() {
  const params = useParams()
  const communityId = params.communityId as string

  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showAvailableOnly, setShowAvailableOnly] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchMembers()
    checkAdminStatus()
  }, [communityId])

  const fetchMembers = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select(`
          id,
          display_name,
          avatar_url,
          bio,
          unit_number,
          phone,
          show_phone,
          show_email,
          skills,
          skills_description,
          available_for_help,
          role,
          joined_at,
          user:user_id (
            email
          )
        `)
        .eq('community_id', communityId)
        .eq('status', 'active')
        .order('display_name')

      if (error) throw error

      const formattedMembers = data?.map((m) => ({
        ...m,
        email: m.show_email ? (m.user as any)?.email : undefined,
        user: m.user as any,
      })) || []

      setMembers(formattedMembers)
    } catch {
      // Silently fail - tables may not exist yet
    } finally {
      setIsLoading(false)
    }
  }

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: member } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .single()

    setIsAdmin(member?.role === 'admin')
  }

  // Filter members based on search, skills, and availability
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const nameMatch = member.display_name?.toLowerCase().includes(query)
        const bioMatch = member.bio?.toLowerCase().includes(query)
        const unitMatch = member.unit_number?.toLowerCase().includes(query)
        const skillsMatch = member.skills?.some((s) =>
          s.toLowerCase().includes(query)
        )
        if (!nameMatch && !bioMatch && !unitMatch && !skillsMatch) {
          return false
        }
      }

      // Skills filter
      if (selectedSkills.length > 0) {
        if (!member.skills || member.skills.length === 0) {
          return false
        }
        const hasMatchingSkill = selectedSkills.some((skill) =>
          member.skills?.includes(skill)
        )
        if (!hasMatchingSkill) {
          return false
        }
      }

      // Available filter
      if (showAvailableOnly && !member.available_for_help) {
        return false
      }

      return true
    })
  }, [members, searchQuery, selectedSkills, showAvailableOnly])

  // Check if member is new (joined within last 7 days)
  const isNewMember = (joinedAt: string) => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return new Date(joinedAt) > weekAgo
  }

  // Stats
  const totalMembers = members.length
  const availableMembers = members.filter((m) => m.available_for_help).length
  const membersWithSkills = members.filter(
    (m) => m.skills && m.skills.length > 0
  ).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground">
            {totalMembers} member{totalMembers !== 1 ? 's' : ''} in this community
          </p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href={`/c/${communityId}/admin/members/invite`}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Members
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{totalMembers}</p>
          <p className="text-sm text-muted-foreground">Total Members</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{availableMembers}</p>
          <p className="text-sm text-muted-foreground">Available to Help</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{membersWithSkills}</p>
          <p className="text-sm text-muted-foreground">With Skills Listed</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <SkillsFilter
            selectedSkills={selectedSkills}
            onSkillsChange={setSelectedSkills}
          />
          <Button
            variant={showAvailableOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowAvailableOnly(!showAvailableOnly)}
            className="whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Available
          </Button>
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as 'grid' | 'list')}
          >
            <TabsList className="h-9">
              <TabsTrigger value="grid" className="px-3">
                <Grid3X3 className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="list" className="px-3">
                <List className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Results count */}
      {(searchQuery || selectedSkills.length > 0 || showAvailableOnly) && (
        <p className="text-sm text-muted-foreground mb-4">
          Showing {filteredMembers.length} of {totalMembers} members
        </p>
      )}

      {/* Members Grid/List */}
      {filteredMembers.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold mb-2">No members found</h3>
          <p className="text-muted-foreground">
            {searchQuery || selectedSkills.length > 0 || showAvailableOnly
              ? 'Try adjusting your filters'
              : 'Be the first to join this community!'}
          </p>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              communityId={communityId}
              variant="card"
              isNew={isNewMember(member.joined_at)}
            />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          {filteredMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              communityId={communityId}
              variant="list"
              isNew={isNewMember(member.joined_at)}
            />
          ))}
        </Card>
      )}
    </div>
  )
}
