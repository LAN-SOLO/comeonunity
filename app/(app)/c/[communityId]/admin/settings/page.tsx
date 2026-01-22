'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
// Native img tags used for logo/cover to handle dynamic Supabase URLs reliably
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ColorPicker } from '@/components/ui/color-picker'
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
  Upload,
  X,
  Megaphone,
  Users,
  Package,
  Calendar,
  Newspaper,
  Link as LinkIcon,
  Eye,
  Bell,
  CheckCircle,
  Settings2,
  ImageIcon,
  Boxes,
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
  cover_image_url: string | null
  primary_color: string
  accent_color: string | null
  welcome_message: string | null
  community_rules: string | null
  website_url: string | null
  social_links: Record<string, string>
  announcement_text: string | null
  announcement_link: string | null
  announcement_active: boolean
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
  { value: 'Europe/Vienna', label: 'Vienna (CET/CEST)' },
  { value: 'Europe/Zurich', label: 'Zurich (CET/CEST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
]

const brandPresetColors = [
  '#007AFF', '#34C759', '#AF52DE', '#FF9500', '#FF3B30',
  '#5856D6', '#00C7BE', '#FF2D55', '#32ADE6', '#BF5AF2',
]

export default function CommunitySettingsPage() {
  const params = useParams()
  const router = useRouter()
  const communitySlug = params.communityId as string

  const [community, setCommunity] = useState<Community | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)

  // Basic Info
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('DE')
  const [timezone, setTimezone] = useState('Europe/Berlin')

  // Branding
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [primaryColor, setPrimaryColor] = useState('#007AFF')
  const [accentColor, setAccentColor] = useState('#6366f1')

  // Content
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [communityRules, setCommunityRules] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')

  // Announcement
  const [announcementText, setAnnouncementText] = useState('')
  const [announcementLink, setAnnouncementLink] = useState('')
  const [announcementActive, setAnnouncementActive] = useState(false)

  // Privacy & Access Settings
  const [allowMemberInvites, setAllowMemberInvites] = useState(false)
  const [requireApproval, setRequireApproval] = useState(true)
  const [showMemberDirectory, setShowMemberDirectory] = useState(true)

  // Feature Toggles
  const [itemsEnabled, setItemsEnabled] = useState(true)
  const [eventsEnabled, setEventsEnabled] = useState(true)
  const [newsEnabled, setNewsEnabled] = useState(true)
  const [resourcesEnabled, setResourcesEnabled] = useState(true)
  const [bookingsEnabled, setBookingsEnabled] = useState(true)

  // Moderation
  const [autoApproveItems, setAutoApproveItems] = useState(true)
  const [autoApproveEvents, setAutoApproveEvents] = useState(false)

  // Display Settings
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true)
  const [showActivityFeed, setShowActivityFeed] = useState(true)
  const [showQuickStats, setShowQuickStats] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchCommunity()
  }, [communitySlug])

  const fetchCommunity = async () => {
    setIsLoading(true)
    try {
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communitySlug)

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

      // Basic Info
      setName(data.name)
      setDescription(data.description || '')
      setType(data.type)
      setAddress(data.address || '')
      setCity(data.city || '')
      setPostalCode(data.postal_code || '')
      setCountry(data.country || 'DE')
      setTimezone(data.timezone || 'Europe/Berlin')

      // Branding
      setLogoUrl(data.logo_url)
      setCoverImageUrl(data.cover_image_url)
      setPrimaryColor(data.primary_color || '#007AFF')
      setAccentColor(data.accent_color || '#6366f1')

      // Content
      setWelcomeMessage(data.welcome_message || '')
      setCommunityRules(data.community_rules || '')
      setWebsiteUrl(data.website_url || '')

      // Announcement
      setAnnouncementText(data.announcement_text || '')
      setAnnouncementLink(data.announcement_link || '')
      setAnnouncementActive(data.announcement_active || false)

      // Load settings from JSONB
      const settings = data.settings || {}
      setAllowMemberInvites(settings.allow_member_invites ?? false)
      setRequireApproval(settings.require_approval ?? true)
      setShowMemberDirectory(settings.show_member_directory ?? true)

      // Features
      const features = settings.features || {}
      setItemsEnabled(features.items_enabled ?? true)
      setEventsEnabled(features.events_enabled ?? true)
      setNewsEnabled(features.news_enabled ?? true)
      setResourcesEnabled(features.resources_enabled ?? true)
      setBookingsEnabled(features.bookings_enabled ?? true)

      // Moderation
      const moderation = settings.moderation || {}
      setAutoApproveItems(moderation.auto_approve_items ?? true)
      setAutoApproveEvents(moderation.auto_approve_events ?? false)

      // Display
      const display = settings.display || {}
      setShowWelcomeBanner(display.show_welcome_banner ?? true)
      setShowActivityFeed(display.show_activity_feed ?? true)
      setShowQuickStats(display.show_quick_stats ?? true)

    } catch (err: any) {
      console.error('Failed to fetch community:', err?.message || err?.code || JSON.stringify(err))
      toast.error(err?.message || 'Failed to load community settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = async (
    file: File,
    type: 'logo' | 'cover'
  ): Promise<string | null> => {
    if (!community) return null

    const setUploading = type === 'logo' ? setIsUploadingLogo : setIsUploadingCover
    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only JPEG, PNG, and WebP images are allowed')
        return null
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB')
        return null
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `${community.id}/${type}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('community-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('community-assets')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (err: any) {
      console.error('Upload failed:', err)
      toast.error(err.message || 'Failed to upload image')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const url = await handleImageUpload(file, 'logo')
    if (url) {
      setLogoUrl(url)
      toast.success('Logo uploaded')
    }
  }

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const url = await handleImageUpload(file, 'cover')
    if (url) {
      setCoverImageUrl(url)
      toast.success('Cover image uploaded')
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
        features: {
          items_enabled: itemsEnabled,
          events_enabled: eventsEnabled,
          news_enabled: newsEnabled,
          resources_enabled: resourcesEnabled,
          bookings_enabled: bookingsEnabled,
        },
        moderation: {
          auto_approve_items: autoApproveItems,
          auto_approve_events: autoApproveEvents,
        },
        display: {
          show_welcome_banner: showWelcomeBanner,
          show_activity_feed: showActivityFeed,
          show_quick_stats: showQuickStats,
        },
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
          logo_url: logoUrl,
          cover_image_url: coverImageUrl,
          primary_color: primaryColor,
          accent_color: accentColor,
          welcome_message: welcomeMessage.trim() || null,
          community_rules: communityRules.trim() || null,
          website_url: websiteUrl.trim() || null,
          announcement_text: announcementText.trim() || null,
          announcement_link: announcementLink.trim() || null,
          announcement_active: announcementActive,
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
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
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
          Customize and configure your community
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
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

              <div className="grid gap-4 sm:grid-cols-2">
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

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
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

          {/* Announcement Banner */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-muted">
                <Megaphone className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">Announcement Banner</h2>
                <p className="text-sm text-muted-foreground">
                  Show a banner message to all members
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Announcement</Label>
                  <p className="text-sm text-muted-foreground">
                    Display banner on dashboard
                  </p>
                </div>
                <Switch
                  checked={announcementActive}
                  onCheckedChange={setAnnouncementActive}
                />
              </div>

              {announcementActive && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="announcementText">Announcement Text</Label>
                    <Textarea
                      id="announcementText"
                      value={announcementText}
                      onChange={(e) => setAnnouncementText(e.target.value)}
                      placeholder="Important: Community meeting this Sunday at 3pm"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="announcementLink">Link (Optional)</Label>
                    <Input
                      id="announcementLink"
                      type="url"
                      value={announcementLink}
                      onChange={(e) => setAnnouncementLink(e.target.value)}
                      placeholder="https://example.com/details"
                    />
                  </div>
                </>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          {/* Logo & Cover */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-muted">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">Logo & Cover Image</h2>
                <p className="text-sm text-muted-foreground">
                  Visual identity for your community
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Logo */}
              <div className="space-y-3">
                <Label>Community Logo</Label>
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 overflow-hidden relative shrink-0">
                    {logoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        onError={() => {
                          console.error('Logo failed to load:', logoUrl)
                          setLogoUrl(null)
                          toast.error('Logo could not be loaded')
                        }}
                      />
                    ) : (
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <label className="cursor-pointer">
                        <Button variant="outline" size="sm" asChild disabled={isUploadingLogo}>
                          <span>
                            {isUploadingLogo ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4 mr-2" />
                            )}
                            {logoUrl ? 'Change Logo' : 'Upload Logo'}
                          </span>
                        </Button>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleLogoChange}
                          className="hidden"
                          disabled={isUploadingLogo}
                        />
                      </label>
                      {logoUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLogoUrl(null)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Square image, max 5MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Cover Image */}
              <div className="space-y-3">
                <Label>Cover Image {coverImageUrl && <span className="text-xs text-muted-foreground ml-2">(URL loaded)</span>}</Label>
                <div
                  className="relative rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 overflow-hidden"
                  style={{ minHeight: '150px', aspectRatio: '3/1' }}
                >
                  {coverImageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={coverImageUrl}
                      alt="Cover"
                      loading="lazy"
                      decoding="async"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      onLoad={() => console.log('Cover image loaded successfully:', coverImageUrl)}
                      onError={(e) => {
                        console.error('Cover image failed to load:', coverImageUrl, e)
                        setCoverImageUrl(null)
                        toast.error('Cover image could not be loaded')
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                        <label className="cursor-pointer">
                          <Button variant="outline" size="sm" asChild disabled={isUploadingCover}>
                            <span>
                              {isUploadingCover ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4 mr-2" />
                              )}
                              Upload Cover
                            </span>
                          </Button>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleCoverChange}
                            className="hidden"
                            disabled={isUploadingCover}
                          />
                        </label>
                        <p className="text-xs text-muted-foreground mt-2">
                          Recommended: 1200 x 400 px
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                {coverImageUrl ? (
                  <div className="flex gap-2">
                    <label className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild disabled={isUploadingCover}>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          Change Cover
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleCoverChange}
                        className="hidden"
                        disabled={isUploadingCover}
                      />
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCoverImageUrl(null)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Delete Cover
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Recommended: 1200 x 400 px, max 5MB
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Colors */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-muted">
                <Palette className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">Brand Colors</h2>
                <p className="text-sm text-muted-foreground">
                  Customize your community&apos;s color scheme
                </p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Used for buttons and key actions
                </p>
                <ColorPicker
                  value={primaryColor}
                  onChange={setPrimaryColor}
                  presetColors={brandPresetColors}
                />
              </div>

              <div className="space-y-2">
                <Label>Accent Color</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Used for highlights and links
                </p>
                <ColorPicker
                  value={accentColor}
                  onChange={setAccentColor}
                  presetColors={brandPresetColors}
                />
              </div>
            </div>

            {/* Preview */}
            <div className="mt-6 p-4 rounded-lg border bg-muted/30">
              <p className="text-sm font-medium mb-3">Preview</p>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  style={{ backgroundColor: primaryColor }}
                  className="text-white"
                >
                  Primary Button
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  style={{ borderColor: accentColor, color: accentColor }}
                >
                  Accent Outline
                </Button>
                <span
                  className="text-sm font-medium"
                  style={{ color: accentColor }}
                >
                  Accent Link
                </span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-muted">
                <Settings2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">Feature Toggles</h2>
                <p className="text-sm text-muted-foreground">
                  Enable or disable community features
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-green-600" />
                  <div>
                    <Label>Lending Library (Items)</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow members to share and borrow items
                    </p>
                  </div>
                </div>
                <Switch
                  checked={itemsEnabled}
                  onCheckedChange={setItemsEnabled}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <div>
                    <Label>Events & Calendar</Label>
                    <p className="text-sm text-muted-foreground">
                      Community events and calendar
                    </p>
                  </div>
                </div>
                <Switch
                  checked={eventsEnabled}
                  onCheckedChange={setEventsEnabled}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <Newspaper className="h-5 w-5 text-amber-600" />
                  <div>
                    <Label>News & Announcements</Label>
                    <p className="text-sm text-muted-foreground">
                      Post news articles and updates
                    </p>
                  </div>
                </div>
                <Switch
                  checked={newsEnabled}
                  onCheckedChange={setNewsEnabled}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <Boxes className="h-5 w-5 text-cyan-600" />
                  <div>
                    <Label>Resources</Label>
                    <p className="text-sm text-muted-foreground">
                      Shared spaces and amenities
                    </p>
                  </div>
                </div>
                <Switch
                  checked={resourcesEnabled}
                  onCheckedChange={setResourcesEnabled}
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <Label>Resource Bookings</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow members to book shared resources
                    </p>
                  </div>
                </div>
                <Switch
                  checked={bookingsEnabled}
                  onCheckedChange={setBookingsEnabled}
                />
              </div>
            </div>
          </Card>

          {/* Moderation */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-muted">
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">Content Moderation</h2>
                <p className="text-sm text-muted-foreground">
                  Control content approval workflows
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-approve Items</Label>
                  <p className="text-sm text-muted-foreground">
                    New items are immediately visible
                  </p>
                </div>
                <Switch
                  checked={autoApproveItems}
                  onCheckedChange={setAutoApproveItems}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-approve Events</Label>
                  <p className="text-sm text-muted-foreground">
                    Member-created events need admin approval
                  </p>
                </div>
                <Switch
                  checked={autoApproveEvents}
                  onCheckedChange={setAutoApproveEvents}
                />
              </div>
            </div>
          </Card>

          {/* Community Rules */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-muted">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">Community Guidelines</h2>
                <p className="text-sm text-muted-foreground">
                  Rules and expectations for members
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rules">Community Rules</Label>
              <Textarea
                id="rules"
                value={communityRules}
                onChange={(e) => setCommunityRules(e.target.value)}
                placeholder="Enter your community guidelines and rules..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                These guidelines will be shown to new members during onboarding
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-muted">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">Member Settings</h2>
                <p className="text-sm text-muted-foreground">
                  Control membership and access
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Member Invites</Label>
                  <p className="text-sm text-muted-foreground">
                    Let existing members invite others
                  </p>
                </div>
                <Switch
                  checked={allowMemberInvites}
                  onCheckedChange={setAllowMemberInvites}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Admin Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    New members need approval before joining
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
                    Members can see other member profiles
                  </p>
                </div>
                <Switch
                  checked={showMemberDirectory}
                  onCheckedChange={setShowMemberDirectory}
                />
              </div>
            </div>
          </Card>

          {/* Welcome Message */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-muted">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">Welcome Message</h2>
                <p className="text-sm text-muted-foreground">
                  Greet new members when they join
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcome">Welcome Message</Label>
              <Textarea
                id="welcome"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="Welcome to our community! Here's what you need to know..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                This message will be displayed to new members on their first visit
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* Display Tab */}
        <TabsContent value="display" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-muted">
                <Eye className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">Dashboard Display</h2>
                <p className="text-sm text-muted-foreground">
                  Customize what members see on the dashboard
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Welcome Banner</Label>
                  <p className="text-sm text-muted-foreground">
                    Display welcome message for new members
                  </p>
                </div>
                <Switch
                  checked={showWelcomeBanner}
                  onCheckedChange={setShowWelcomeBanner}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Activity Feed</Label>
                  <p className="text-sm text-muted-foreground">
                    Display recent community activity
                  </p>
                </div>
                <Switch
                  checked={showActivityFeed}
                  onCheckedChange={setShowActivityFeed}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Quick Stats</Label>
                  <p className="text-sm text-muted-foreground">
                    Display community statistics cards
                  </p>
                </div>
                <Switch
                  checked={showQuickStats}
                  onCheckedChange={setShowQuickStats}
                />
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end mt-6 pt-6 border-t">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save All Changes
        </Button>
      </div>
    </div>
  )
}
