'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/design-system/section-header'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft,
  Camera,
  Loader2,
  Save,
  Sparkles,
  Plus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  skillCategories,
  isCustomSkill,
  getSkillDisplayName,
  createCustomSkillValue,
  CUSTOM_SKILL_PREFIX
} from '@/components/members/skills-filter'

interface ProfileFormData {
  display_name: string
  bio: string
  unit_number: string
  phone: string
  show_phone: boolean
  show_email: boolean
  skills: string[]
  skills_description: string
  available_for_help: boolean
}

export default function EditProfilePage() {
  const params = useParams()
  const router = useRouter()
  const communitySlug = params.communityId as string
  const memberId = params.memberId as string

  const [communityId, setCommunityId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [formData, setFormData] = useState<ProfileFormData>({
    display_name: '',
    bio: '',
    unit_number: '',
    phone: '',
    show_phone: false,
    show_email: false,
    skills: [],
    skills_description: '',
    available_for_help: false,
  })

  const [customSkillInput, setCustomSkillInput] = useState('')

  const supabase = createClient()

  useEffect(() => {
    initializePage()
  }, [memberId, communitySlug])

  const initializePage = async () => {
    setIsLoading(true)
    try {
      // Check if the value looks like a UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communitySlug)

      // First fetch community to get the ID
      let communityQuery = supabase
        .from('communities')
        .select('id')

      if (isUUID) {
        communityQuery = communityQuery.or(`slug.eq.${communitySlug},id.eq.${communitySlug}`)
      } else {
        communityQuery = communityQuery.eq('slug', communitySlug)
      }

      const { data: community } = await communityQuery.single()

      if (!community) {
        router.push('/')
        return
      }

      setCommunityId(community.id)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get member profile
      const { data: member, error } = await supabase
        .from('community_members')
        .select('*')
        .eq('id', memberId)
        .eq('community_id', community.id)
        .single()

      if (error || !member) {
        toast.error('Profile not found')
        router.push(`/c/${communitySlug}/members`)
        return
      }

      // Verify this is the user's own profile
      if (member.user_id !== user.id) {
        toast.error('You can only edit your own profile')
        router.push(`/c/${communitySlug}/members/${memberId}`)
        return
      }

      setAvatarUrl(member.avatar_url)
      setFormData({
        display_name: member.display_name || '',
        bio: member.bio || '',
        unit_number: member.unit_number || '',
        phone: member.phone || '',
        show_phone: member.show_phone || false,
        show_email: member.show_email || false,
        skills: member.skills || [],
        skills_description: member.skills_description || '',
        available_for_help: member.available_for_help || false,
      })
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      toast.error('Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setIsUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${memberId}.${fileExt}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Add cache buster
      const urlWithCache = `${publicUrl}?t=${Date.now()}`
      setAvatarUrl(urlWithCache)

      // Update member record
      await supabase
        .from('community_members')
        .update({ avatar_url: urlWithCache })
        .eq('id', memberId)

      toast.success('Avatar updated')
    } catch (err) {
      console.error('Upload failed:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload avatar'
      toast.error(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const toggleSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }))
  }

  const addCustomSkill = () => {
    const trimmed = customSkillInput.trim()
    if (!trimmed) return

    const customValue = createCustomSkillValue(trimmed)
    if (!formData.skills.includes(customValue)) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, customValue],
      }))
    }
    setCustomSkillInput('')
  }

  const handleCustomSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCustomSkill()
    }
  }

  // Separate predefined and custom skills for display
  const predefinedSkills = formData.skills.filter((s) => !isCustomSkill(s))
  const customSkills = formData.skills.filter((s) => isCustomSkill(s))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('community_members')
        .update({
          display_name: formData.display_name || null,
          bio: formData.bio || null,
          unit_number: formData.unit_number || null,
          phone: formData.phone || null,
          show_phone: formData.show_phone,
          show_email: formData.show_email,
          skills: formData.skills,
          skills_description: formData.skills_description || null,
          available_for_help: formData.available_for_help,
        })
        .eq('id', memberId)

      if (error) throw error

      toast.success('Profile updated')
      router.push(`/c/${communitySlug}/members/${memberId}`)
    } catch (err) {
      console.error('Save failed:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save profile'
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const displayName = formData.display_name || 'Member'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/c/${communitySlug}/members/${memberId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Profile
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Edit Profile</h1>
        <p className="text-muted-foreground mt-1">
          Update your community profile information
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Avatar Section */}
        <SectionHeader title="Profile Photo" />
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={isUploading}
              />
            </div>
            <div>
              <p className="font-medium">Profile Photo</p>
              <p className="text-sm text-muted-foreground">
                Upload a photo to help neighbors recognize you
              </p>
            </div>
          </div>
        </Card>

        {/* Basic Info */}
        <SectionHeader title="Basic Information" />
        <Card className="p-6 mb-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) =>
                setFormData({ ...formData, display_name: e.target.value })
              }
              placeholder="How you want to be called"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit_number">Unit / Address</Label>
            <Input
              id="unit_number"
              value={formData.unit_number}
              onChange={(e) =>
                setFormData({ ...formData, unit_number: e.target.value })
              }
              placeholder="e.g., Apt 4B, House 12"
            />
            <p className="text-xs text-muted-foreground">
              Helps neighbors know where you live
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
              placeholder="Tell your neighbors a bit about yourself..."
              rows={3}
            />
          </div>
        </Card>

        {/* Contact Info */}
        <SectionHeader title="Contact Information" />
        <Card className="p-6 mb-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Show Phone Number</p>
              <p className="text-sm text-muted-foreground">
                Allow community members to see your phone number
              </p>
            </div>
            <Switch
              checked={formData.show_phone}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, show_phone: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Show Email Address</p>
              <p className="text-sm text-muted-foreground">
                Allow community members to see your email
              </p>
            </div>
            <Switch
              checked={formData.show_email}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, show_email: checked })
              }
            />
          </div>
        </Card>

        {/* Skills Section */}
        <SectionHeader title="Skills & Expertise" />
        <Card className="p-6 mb-6 space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-green" />
                Available to Help
              </p>
              <p className="text-sm text-muted-foreground">
                Let neighbors know you&apos;re open to helping out
              </p>
            </div>
            <Switch
              checked={formData.available_for_help}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, available_for_help: checked })
              }
            />
          </div>

          <div className="border-t border-border pt-4">
            <Label className="mb-3 block">Select Your Skills</Label>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {skillCategories.map((category) => (
                  <div key={category.name}>
                    <div className="flex items-center gap-2 mb-2">
                      <category.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-6">
                      {category.skills.map((skill) => (
                        <label
                          key={skill.value}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Checkbox
                            checked={formData.skills.includes(skill.value)}
                            onCheckedChange={() => toggleSkill(skill.value)}
                          />
                          <span className="text-sm">{skill.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Custom Skills Input */}
          <div className="border-t border-border pt-4">
            <Label className="mb-2 block">Add Custom Skills</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Can&apos;t find your skill? Add your own custom skills below.
            </p>
            <div className="flex gap-2">
              <Input
                value={customSkillInput}
                onChange={(e) => setCustomSkillInput(e.target.value)}
                onKeyDown={handleCustomSkillKeyDown}
                placeholder="e.g., Beekeeping, 3D Printing..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addCustomSkill}
                disabled={!customSkillInput.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            {customSkills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {customSkills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="cursor-pointer hover:bg-secondary/80"
                    onClick={() => toggleSkill(skill)}
                  >
                    {getSkillDisplayName(skill)}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {formData.skills.length > 0 && (
            <div className="border-t border-border pt-4">
              <Label className="mb-2 block">Selected Skills ({formData.skills.length})</Label>
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill) => (
                  <Badge
                    key={skill}
                    variant={isCustomSkill(skill) ? 'outline' : 'secondary'}
                    className="cursor-pointer hover:bg-secondary/80"
                    onClick={() => toggleSkill(skill)}
                  >
                    {getSkillDisplayName(skill)} ×
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="skills_description">Skills Description</Label>
            <Textarea
              id="skills_description"
              value={formData.skills_description}
              onChange={(e) =>
                setFormData({ ...formData, skills_description: e.target.value })
              }
              placeholder="Describe your experience or any details about your skills..."
              rows={3}
            />
          </div>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-3">
          <Button type="submit" disabled={isSaving} className="flex-1">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/c/${communitySlug}/members/${memberId}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
