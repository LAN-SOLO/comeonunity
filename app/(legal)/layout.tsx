import { CookieConsent } from '@/components/legal/cookie-consent'

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <CookieConsent />
    </>
  )
}
