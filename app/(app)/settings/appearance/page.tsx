'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ChevronLeft, Loader2, Sun, Moon, Monitor, Check, Home, Palette } from 'lucide-react'
import { toast } from 'sonner'

const themes = [
  {
    value: 'light',
    label: 'Light',
    description: 'Light background with dark text',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Dark background with light text',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Follows your device settings',
    icon: Monitor,
  },
]

export default function AppearanceSettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const supabase = createClient()

  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    loadUser()
  }, [])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      // Load saved theme preference from database
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('theme_preference')
        .eq('id', user.id)
        .single()

      if (profile?.theme_preference) {
        setTheme(profile.theme_preference)
      }
    }
  }

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme)

    if (!userId) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ theme_preference: newTheme })
        .eq('id', userId)

      if (error) throw error

      toast.success('Theme updated')
    } catch (error) {
      console.error('Failed to save theme preference:', error)
      // Theme is still applied locally, just not saved to DB
    } finally {
      setSaving(false)
    }
  }

  if (!mounted) {
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
          <h1 className="text-2xl font-bold">Appearance</h1>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
          <span>Home</span>
        </Link>
      </div>

      {/* Theme Selection */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <Label className="text-base font-semibold">Theme</Label>
            <p className="text-sm text-muted-foreground">
              Choose how ComeOnUnity looks to you
            </p>
          </div>
          {saving && (
            <Loader2 className="h-4 w-4 animate-spin ml-auto text-muted-foreground" />
          )}
        </div>

        <div className="grid gap-3">
          {themes.map((t) => {
            const Icon = t.icon
            const isSelected = theme === t.value
            const isCurrentlyActive = t.value === 'system'
              ? resolvedTheme === 'light' || resolvedTheme === 'dark'
              : resolvedTheme === t.value

            return (
              <button
                key={t.value}
                onClick={() => handleThemeChange(t.value)}
                disabled={saving}
                className={`flex items-center justify-between p-4 border rounded-lg transition-colors text-left ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${
                    t.value === 'light'
                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                      : t.value === 'dark'
                      ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{t.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.description}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <Check className="h-5 w-5 text-primary shrink-0" />
                )}
              </button>
            )
          })}
        </div>

        {/* Preview */}
        <div className="mt-6 pt-6 border-t">
          <p className="text-sm font-medium mb-3">Preview</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Light preview */}
            <div className="rounded-lg border overflow-hidden">
              <div className="bg-white p-3 border-b">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
              </div>
              <div className="bg-white p-3">
                <div className="h-2 w-16 bg-gray-900 rounded mb-2" />
                <div className="h-2 w-24 bg-gray-300 rounded mb-1" />
                <div className="h-2 w-20 bg-gray-300 rounded" />
              </div>
              <div className="bg-gray-100 px-3 py-1.5 text-xs text-gray-600 text-center">
                Light
              </div>
            </div>

            {/* Dark preview */}
            <div className="rounded-lg border overflow-hidden">
              <div className="bg-gray-900 p-3 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
              </div>
              <div className="bg-gray-900 p-3">
                <div className="h-2 w-16 bg-white rounded mb-2" />
                <div className="h-2 w-24 bg-gray-600 rounded mb-1" />
                <div className="h-2 w-20 bg-gray-600 rounded" />
              </div>
              <div className="bg-gray-800 px-3 py-1.5 text-xs text-gray-400 text-center">
                Dark
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
