'use client'

import { useTransition } from 'react'
import { useLocale } from 'next-intl'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Globe, Check } from 'lucide-react'
import { locales, type Locale } from '@/i18n/request'

const localeLabels: Record<Locale, { label: string; flag: string }> = {
  de: { label: 'Deutsch', flag: '🇩🇪' },
  en: { label: 'English', flag: '🇬🇧' },
}

interface LanguageSwitcherProps {
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showLabel?: boolean
}

export function LanguageSwitcher({
  variant = 'ghost',
  size = 'sm',
  showLabel = false,
}: LanguageSwitcherProps) {
  const locale = useLocale()
  const [isPending, startTransition] = useTransition()

  const handleLocaleChange = (newLocale: Locale) => {
    startTransition(async () => {
      // Set the locale cookie
      await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale }),
      })

      // Refresh the page to apply the new locale
      window.location.reload()
    })
  }

  const currentLocale = localeLabels[locale as Locale] || localeLabels.de

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isPending}
          className="gap-2"
        >
          <Globe className="h-4 w-4" />
          {showLabel && (
            <span>
              {currentLocale.flag} {currentLocale.label}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className="gap-2"
          >
            <span>{localeLabels[loc].flag}</span>
            <span>{localeLabels[loc].label}</span>
            {locale === loc && <Check className="h-4 w-4 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
