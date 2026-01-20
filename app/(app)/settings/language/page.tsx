'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ChevronLeft, Loader2, Globe, Check, Home } from 'lucide-react'
import { toast } from 'sonner'

const languages = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
]

const timezones = [
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Zurich', label: 'Zurich (CET/CEST)' },
  { value: 'Europe/Vienna', label: 'Vienna (CET/CEST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
]

export default function LanguageSettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [locale, setLocale] = useState('de')
  const [timezone, setTimezone] = useState('Europe/Berlin')

  useEffect(() => {
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('locale, timezone')
        .eq('id', user.id)
        .single()

      if (profile) {
        setLocale(profile.locale || 'de')
        setTimezone(profile.timezone || 'Europe/Berlin')
      }
      setLoading(false)
    }
    loadSettings()
  }, [])

  const updateLocale = async (newLocale: string) => {
    if (!userId) return

    setSaving(true)
    setLocale(newLocale)

    try {
      // Update in database
      const { error } = await supabase
        .from('user_profiles')
        .update({ locale: newLocale })
        .eq('id', userId)

      if (error) throw error

      // Update cookie via API
      await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale }),
      })

      toast.success('Language updated', {
        description: 'Refreshing page to apply changes...',
      })

      // Reload to apply new locale
      setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      console.error('Failed to update locale:', error)
      toast.error('Failed to update language')
    } finally {
      setSaving(false)
    }
  }

  const updateTimezone = async (newTimezone: string) => {
    if (!userId) return

    setSaving(true)
    setTimezone(newTimezone)

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ timezone: newTimezone })
        .eq('id', userId)

      if (error) throw error

      toast.success('Timezone updated')
    } catch (error) {
      console.error('Failed to update timezone:', error)
      toast.error('Failed to update timezone')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Language & Region</h1>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
          <span>Home</span>
        </Link>
      </div>

      {/* Language Selection */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div>
            <Label className="text-base font-semibold">Language</Label>
            <p className="text-sm text-muted-foreground">
              Choose your preferred language
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => updateLocale(lang.code)}
              disabled={saving}
              className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                locale === lang.code
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{lang.flag}</span>
                <span className="font-medium">{lang.name}</span>
              </div>
              {locale === lang.code && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* Timezone Selection */}
      <Card className="p-6">
        <div className="mb-4">
          <Label className="text-base font-semibold">Timezone</Label>
          <p className="text-sm text-muted-foreground">
            Used for displaying event times and notifications
          </p>
        </div>

        <div className="grid gap-2 max-h-[300px] overflow-y-auto">
          {timezones.map((tz) => (
            <button
              key={tz.value}
              onClick={() => updateTimezone(tz.value)}
              disabled={saving}
              className={`flex items-center justify-between p-3 border rounded-lg transition-colors text-left ${
                timezone === tz.value
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted/50'
              }`}
            >
              <span className="font-medium">{tz.label}</span>
              {timezone === tz.value && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
