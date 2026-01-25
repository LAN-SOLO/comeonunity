'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Cookie, Settings, X } from 'lucide-react'

const COOKIE_CONSENT_KEY = 'cookie-consent'

interface CookiePreferences {
  necessary: boolean
  functional: boolean
  analytics: boolean
  marketing: boolean
  timestamp: string
}

const defaultPreferences: CookiePreferences = {
  necessary: true, // Always required
  functional: false,
  analytics: false,
  marketing: false,
  timestamp: '',
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences)

  useEffect(() => {
    // Check if consent was already given
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!stored) {
      queueMicrotask(() => setShowBanner(true))
    } else {
      try {
        const parsed = JSON.parse(stored) as CookiePreferences
        queueMicrotask(() => setPreferences(parsed))
      } catch {
        queueMicrotask(() => setShowBanner(true))
      }
    }
  }, [])

  const savePreferences = (prefs: CookiePreferences) => {
    const toSave = { ...prefs, timestamp: new Date().toISOString() }
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(toSave))
    setPreferences(toSave)
    setShowBanner(false)
    setShowSettings(false)
  }

  const acceptAll = () => {
    savePreferences({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
      timestamp: '',
    })
  }

  const acceptNecessaryOnly = () => {
    savePreferences({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
      timestamp: '',
    })
  }

  const saveCustomPreferences = () => {
    savePreferences(preferences)
  }

  if (!showBanner) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center bg-black/50">
      <Card className="w-full max-w-2xl p-6 shadow-2xl">
        {!showSettings ? (
          <>
            <div className="flex items-start gap-4 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Cookie className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold mb-2">Cookie-Einstellungen</h2>
                <p className="text-sm text-muted-foreground">
                  Wir verwenden Cookies, um Ihnen die bestmögliche Erfahrung auf unserer Website zu bieten.
                  Einige Cookies sind für den Betrieb der Website erforderlich, während andere uns helfen,
                  die Website zu verbessern und Ihnen personalisierte Inhalte anzuzeigen.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <Button onClick={acceptAll} className="flex-1">
                Alle akzeptieren
              </Button>
              <Button onClick={acceptNecessaryOnly} variant="outline" className="flex-1">
                Nur notwendige
              </Button>
              <Button onClick={() => setShowSettings(true)} variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Weitere Informationen finden Sie in unserer{' '}
              <Link href="/privacy" className="underline hover:text-foreground">
                Datenschutzerklärung
              </Link>
              .
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Cookie-Einstellungen anpassen</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Necessary Cookies */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex-1 mr-4">
                  <Label className="font-medium">Notwendige Cookies</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Diese Cookies sind für den Betrieb der Website erforderlich und können nicht deaktiviert werden.
                    Sie ermöglichen grundlegende Funktionen wie Seitennavigation und Zugang zu gesicherten Bereichen.
                  </p>
                </div>
                <Switch checked={true} disabled />
              </div>

              {/* Functional Cookies */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex-1 mr-4">
                  <Label className="font-medium">Funktionale Cookies</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Diese Cookies ermöglichen erweiterte Funktionen wie Spracheinstellungen und Benachrichtigungen.
                  </p>
                </div>
                <Switch
                  checked={preferences.functional}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, functional: checked })
                  }
                />
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex-1 mr-4">
                  <Label className="font-medium">Analyse-Cookies</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Diese Cookies helfen uns zu verstehen, wie Besucher mit der Website interagieren,
                    um die Benutzererfahrung zu verbessern.
                  </p>
                </div>
                <Switch
                  checked={preferences.analytics}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, analytics: checked })
                  }
                />
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex-1 mr-4">
                  <Label className="font-medium">Marketing-Cookies</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Diese Cookies werden verwendet, um Werbung relevanter für Sie zu gestalten.
                  </p>
                </div>
                <Switch
                  checked={preferences.marketing}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, marketing: checked })
                  }
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveCustomPreferences} className="flex-1">
                Einstellungen speichern
              </Button>
              <Button onClick={acceptAll} variant="outline" className="flex-1">
                Alle akzeptieren
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

// Hook to check cookie consent
export function useCookieConsent() {
  const [consent, setConsent] = useState<CookiePreferences | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (stored) {
      try {
        queueMicrotask(() => setConsent(JSON.parse(stored)))
      } catch {
        queueMicrotask(() => setConsent(null))
      }
    }
  }, [])

  return consent
}
