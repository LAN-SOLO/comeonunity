'use client'

import { useLanguage } from '@/lib/i18n/language-context'
import { cn } from '@/lib/utils'

interface LanguageSwitcherProps {
  className?: string
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage()

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'de' : 'en')}
      className={cn(
        'text-xs text-muted-foreground hover:text-foreground transition-colors',
        className
      )}
    >
      {language === 'en' ? 'DE' : 'EN'}
    </button>
  )
}
