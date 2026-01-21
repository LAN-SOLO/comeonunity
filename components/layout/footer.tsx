'use client'

import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>&copy; {currentYear} ComeOnUnity</span>
            <span className="hidden sm:inline">|</span>
            <span className="hidden sm:inline">Ein Produkt der artnorama UG</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link
              href="/imprint"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Impressum
            </Link>
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Datenschutz
            </Link>
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Nutzungsbedingungen
            </Link>
            <button
              onClick={() => {
                // Clear cookie consent to re-show the banner
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('cookie-consent')
                  window.location.reload()
                }
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Cookie-Einstellungen
            </button>
          </nav>
        </div>
      </div>
    </footer>
  )
}
