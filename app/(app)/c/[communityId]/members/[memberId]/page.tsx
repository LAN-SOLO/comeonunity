import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/design-system/section-header'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Sparkles,
  Edit,
  Package,
  MessageCircle,
} from 'lucide-react'

interface Props {
  params: Promise<{ communityId: string; memberId: string }>
}

const skillLabels: Record<string, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  carpentry: 'Carpentry',
  painting: 'Painting',
  gardening: 'Gardening',
  computer_help: 'Computer Help',
  smartphone_help: 'Smartphone Help',
  printer_setup: 'Printer Setup',
  wifi_setup: 'WiFi Setup',
  german_help: 'German Help',
  english_help: 'English Help',
  translation: 'Translation',
  pet_sitting: 'Pet Sitting',
  plant_care: 'Plant Care',
  elderly_assistance: 'Elderly Assistance',
  childcare: 'Childcare',
  driving: 'Driving',
  moving_help: 'Moving Help',
  errands: 'Errands',
  cooking: 'Cooking',
  tutoring: 'Tutoring',
  music_lessons: 'Music Lessons',
  fitness: 'Fitness',
  photography: 'Photography',
}

export default async function MemberProfilePage({ params }: Props) {
  const { communityId, memberId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get member profile
  let member = null
  try {
    const { data } = await supabase
      .from('community_members')
      .select(`
        id,
        user_id,
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
        last_active_at,
        user:user_id (
          email
        )
      `)
      .eq('id', memberId)
      .eq('community_id', communityId)
      .eq('status', 'active')
      .single()
    member = data
  } catch {
    // Tables may not exist yet
  }

  if (!member) {
    notFound()
  }

  // Check if viewing own profile
  const isOwnProfile = member.user_id === user.id

  // Get member's items
  let items = null
  try {
    const { data } = await supabase
      .from('items')
      .select('id, name, category, status, images')
      .eq('owner_id', memberId)
      .eq('community_id', communityId)
      .limit(6)
    items = data
  } catch {
    // Tables may not exist yet
  }

  const displayName = member.display_name || 'Member'
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const email = member.show_email ? (member.user as any)?.email : null
  const phone = member.show_phone ? member.phone : null

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/c/${communityId}/members`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Members
        </Link>
      </div>

      {/* Profile Header */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={member.avatar_url || undefined} />
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold">{displayName}</h1>
                  {member.role === 'admin' && (
                    <Badge variant="secondary">Admin</Badge>
                  )}
                  {member.role === 'moderator' && (
                    <Badge variant="outline">Moderator</Badge>
                  )}
                </div>

                {member.unit_number && (
                  <p className="text-muted-foreground flex items-center gap-1 mb-2">
                    <MapPin className="h-4 w-4" />
                    {member.unit_number}
                  </p>
                )}

                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Member since {new Date(member.joined_at).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              {isOwnProfile && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/c/${communityId}/members/${memberId}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Link>
                </Button>
              )}
            </div>

            {member.available_for_help && (
              <Badge className="mt-3 bg-green text-white">
                <Sparkles className="h-3 w-3 mr-1" />
                Available to Help
              </Badge>
            )}
          </div>
        </div>

        {member.bio && (
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-muted-foreground">{member.bio}</p>
          </div>
        )}

        {/* Contact buttons */}
        {(email || phone) && !isOwnProfile && (
          <div className="mt-6 pt-6 border-t border-border flex flex-wrap gap-3">
            {email && (
              <Button asChild>
                <a href={`mailto:${email}`}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </a>
              </Button>
            )}
            {phone && (
              <Button variant="outline" asChild>
                <a href={`tel:${phone}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  {phone}
                </a>
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Skills Section */}
      {member.skills && member.skills.length > 0 && (
        <>
          <SectionHeader title="Skills & Expertise" />
          <Card className="p-6 mb-6">
            <div className="flex flex-wrap gap-2 mb-4">
              {member.skills.map((skill: string) => (
                <Badge key={skill} variant="secondary" className="text-sm py-1 px-3">
                  {skillLabels[skill] || skill}
                </Badge>
              ))}
            </div>
            {member.skills_description && (
              <p className="text-muted-foreground">{member.skills_description}</p>
            )}
          </Card>
        </>
      )}

      {/* Items Section */}
      {items && items.length > 0 && (
        <>
          <SectionHeader
            title="Items for Lending"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/c/${communityId}/items?owner=${memberId}`}>
                  View all
                </Link>
              </Button>
            }
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {items.map((item: any) => (
              <Link key={item.id} href={`/c/${communityId}/items/${item.id}`}>
                <Card className="p-3 hover:shadow-md transition-shadow">
                  <div className="aspect-square rounded-lg bg-muted mb-2 flex items-center justify-center overflow-hidden">
                    {item.images && item.images[0] ? (
                      <img
                        src={item.images[0]}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <Badge
                    variant={item.status === 'available' ? 'default' : 'secondary'}
                    className="text-xs mt-1"
                  >
                    {item.status}
                  </Badge>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Empty state for own profile */}
      {isOwnProfile && (!member.skills || member.skills.length === 0) && (!items || items.length === 0) && (
        <Card className="p-8 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold mb-2">Complete Your Profile</h3>
          <p className="text-muted-foreground mb-4">
            Add your skills and list items to help your community members find you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link href={`/c/${communityId}/members/${memberId}/edit`}>
                Add Skills
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/c/${communityId}/items/new`}>
                List an Item
              </Link>
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
