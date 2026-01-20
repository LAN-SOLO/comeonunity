import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'

export const locales = ['de', 'en'] as const
export const defaultLocale = 'de' as const

export type Locale = (typeof locales)[number]

/**
 * Get locale from cookie, Accept-Language header, or default
 */
async function getLocale(): Promise<Locale> {
  // 1. Check cookie
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get('locale')?.value

  if (localeCookie && locales.includes(localeCookie as Locale)) {
    return localeCookie as Locale
  }

  // 2. Check Accept-Language header
  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language')

  if (acceptLanguage) {
    // Parse accept-language header
    const languages = acceptLanguage
      .split(',')
      .map((lang) => {
        const [locale, q = '1'] = lang.trim().split(';q=')
        return { locale: locale.split('-')[0], quality: parseFloat(q) }
      })
      .sort((a, b) => b.quality - a.quality)

    for (const { locale } of languages) {
      if (locales.includes(locale as Locale)) {
        return locale as Locale
      }
    }
  }

  // 3. Return default
  return defaultLocale
}

export default getRequestConfig(async () => {
  const locale = await getLocale()

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  }
})
