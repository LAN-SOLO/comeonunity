import Link from 'next/link'
import { LogoText } from '@/components/brand/logo-text'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Logo header */}
      <header className="absolute top-0 left-0 right-0 p-6">
        <Link href="/" className="inline-flex items-center">
          <LogoText size="md" />
        </Link>
      </header>

      {/* Main content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 p-6">
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/imprint" className="hover:text-foreground transition-colors">
            Impressum
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Datenschutz
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Nutzungsbedingungen
          </Link>
        </div>
      </footer>
    </div>
  )
}
