'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Loader2,
  Building2,
  Globe,
  Palette,
  Shield,
} from 'lucide-react'
import { toast } from 'sonner'

interface Community {
  id: string
  name: string
  slug: string
  description: string | null
  type: string
  address: string | null
  city: string | null
  postal_code: string | null
  country: string
  locale: string
  timezone: string
  logo_url: string | null
  primary_color: string
  settings: Record<string, any>
}

const communityTypes = [
  { value: 'weg', label: 'WEG (Homeowners Association)' },
  { value: 'house', label: 'Apartment Building' },
  { value: 'neighborhood', label: 'Neighborhood' },
  { value: 'cohousing', label: 'Cohousing' },
  { value: 'interest', label: 'Interest Group' },
]

const timezones = [
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
]

const colorOptions = [
  { value: '#007AFF', label: 'Blue' },
  { value: '#34C759', label: 'Green' },
  { value: '#AF52DE', label: 'Purple' },
  { value: '#FF9500', label: 'Orange' },
  { value: '#FF3B30', label: 'Red' },
  { value: '#5856D6', label: 'Indigo' },
  { value: '#00C7BE', label: 'Teal' },
  { value: '#FF2D55', label: 'Pink' },
]

export default function CommunitySettingsPage() {
  const params = useParams()
  const router = useRouter()
  const communitySlug = params.communityId as string

  const [community, setCommunity] = useState<Community | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('DE')
  const [timezone, setTimezone] = useState('Europe/Berlin')
  const [primaryColor, setPrimaryColor] = useState('#007AFF')

  // Settings
  const [allowMemberInvites, setAllowMemberInvites] = useState(false)
  const [requireApproval, setRequireApproval] = useState(true)
  const [showMemberDirectory, setShowMemberDirectory] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchCommunity()
  }, [communitySlug])

  const fetchCommunity = async () => {
    setIsLoading(true)
    try {
      // Check if the value looks like a UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communitySlug)

      // Fetch by slug or ID for compatibility
      let communityQuery = supabase
        .from('communities')
        .select('*')
        .eq('status', 'active')

      if (isUUID) {
        communityQuery = communityQuery.or(`slug.eq.${communitySlug},id.eq.${communitySlug}`)
      } else {
        communityQuery = communityQuery.eq('slug', communitySlug)
      }

      const { data, error } = await communityQuery.single()

      if (error) throw error

      setCommunity(data)
      setName(data.name)
      setDescription(data.description || '')
      setType(data.type)
      setAddress(data.address || '')
      setCity(data.city || '')
      setPostalCode(data.postal_code || '')
      setCountry(data.country || 'DE')
      setTimezone(data.timezone || 'Europe/Berlin')
      setPrimaryColor(data.primary_color || '#007AFF')

      // Load settings
      const settings = data.settings || {}
      setAllowMemberInvites(settings.allow_member_invites ?? false)
      setRequireApproval(settings.require_approval ?? true)
      setShowMemberDirectory(settings.show_member_directory ?? true)
    } catch (err) {
      console.error('Failed to fetch community:', err)
      toast.error('Failed to load community settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Community name is required')
      return
    }

    setIsSaving(true)
    try {
      const settings = {
        allow_member_invites: allowMemberInvites,
        require_approval: requireApproval,
        show_member_directory: showMemberDirectory,
      }

      const { error } = await supabase
        .from('communities')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          type,
          address: address.trim() || null,
          city: city.trim() || null,
          postal_code: postalCode.trim() || null,
          country,
          timezone,
          primary_color: primaryColor,
          settings,
        })
        .eq('id', community?.id)

      if (error) throw error

      toast.success('Settings saved successfully')
    } catch (err) {
      console.error('Failed to save settings:', err)
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/c/${communitySlug}/admin`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Community Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your community preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-muted">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-semibold">Basic Information</h2>
              <p className="text-sm text-muted-foreground">
                General community details
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Community Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Community"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of your community..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Community Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {communityTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Location */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-muted">
              <Globe className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-semibold">Location & Timezone</h2>
              <p className="text-sm text-muted-foreground">
                Where your community is located
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="12345"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="DE"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Appearance */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-muted">
              <Palette className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-semibold">Appearance</h2>
              <p className="text-sm text-muted-foreground">
                Customize your community&apos;s look
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <Select value={primaryColor} onValueChange={setPrimaryColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: c.value }}
                        />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Privacy & Access */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-muted">
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-semibold">Privacy & Access</h2>
              <p className="text-sm text-muted-foreground">
                Control who can access your community
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Member Invites</Label>
                <p className="text-sm text-muted-foreground">
                  Let members invite others to join
                </p>
              </div>
              <Switch
                checked={allowMemberInvites}
                onCheckedChange={setAllowMemberInvites}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Require Approval</Label>
                <p className="text-sm text-muted-foreground">
                  New members need admin approval
                </p>
              </div>
              <Switch
                checked={requireApproval}
                onCheckedChange={setRequireApproval}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Show Member Directory</Label>
                <p className="text-sm text-muted-foreground">
                  Display member list to all members
                </p>
              </div>
              <Switch
                checked={showMemberDirectory}
                onCheckedChange={setShowMemberDirectory}
              />
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
