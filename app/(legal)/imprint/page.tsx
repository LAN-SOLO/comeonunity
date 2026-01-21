import { Metadata } from 'next'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Building2, Mail, Phone, Scale } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Impressum | ComeOnUnity',
  description: 'Impressum und rechtliche Informationen zu ComeOnUnity',
}

export default function ImprintPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zur Startseite
        </Link>

        <h1 className="text-3xl font-bold mb-8">Impressum</h1>

        <div className="space-y-8">
          {/* Company Information */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Angaben gemäß § 5 TMG</h2>
            </div>

            <div className="space-y-4 text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">artnorama UG (haftungsbeschränkt)</p>
                <p>Traute-Lafrenz-Straße 106</p>
                <p>22297 Hamburg</p>
                <p>Deutschland</p>
              </div>

              <div>
                <p className="font-medium text-foreground">Handelsregister:</p>
                <p>Amtsgericht Hamburg, HRB 152002 B</p>
              </div>

              <div>
                <p className="font-medium text-foreground">Umsatzsteuer-Identifikationsnummer:</p>
                <p>DE319436327</p>
              </div>
            </div>
          </Card>

          {/* Management */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Scale className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Vertretungsberechtigte Geschäftsführer</h2>
            </div>

            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Stefan Mau</li>
              <li>Per Niemann</li>
            </ul>
          </Card>

          {/* Contact */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Kontakt</h2>
            </div>

            <div className="space-y-2 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">E-Mail:</span>{' '}
                <a href="mailto:info@comeonunity.app" className="hover:text-primary underline">
                  info@comeonunity.app
                </a>
              </p>
            </div>
          </Card>

          {/* Responsible for Content */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
            </h2>
            <div className="text-muted-foreground">
              <p>Stefan Mau</p>
              <p>Traute-Lafrenz-Straße 106</p>
              <p>22297 Hamburg</p>
            </div>
          </Card>

          {/* EU Dispute Resolution */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">EU-Streitschlichtung</h2>
            <div className="text-muted-foreground space-y-4">
              <p>
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
                <a
                  href="https://ec.europa.eu/consumers/odr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  https://ec.europa.eu/consumers/odr/
                </a>
              </p>
              <p>Unsere E-Mail-Adresse finden Sie oben im Impressum.</p>
            </div>
          </Card>

          {/* Consumer Dispute Resolution */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              Verbraucherstreitbeilegung/Universalschlichtungsstelle
            </h2>
            <p className="text-muted-foreground">
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </Card>

          {/* Liability Disclaimer */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Haftungsausschluss</h2>
            <div className="text-muted-foreground space-y-4">
              <div>
                <h3 className="font-medium text-foreground mb-2">Haftung für Inhalte</h3>
                <p>
                  Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen
                  Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir
                  als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte
                  fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
                  rechtswidrige Tätigkeit hinweisen.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-2">Haftung für Links</h3>
                <p>
                  Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir
                  keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine
                  Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige
                  Anbieter oder Betreiber der Seiten verantwortlich.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-2">Urheberrecht</h3>
                <p>
                  Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten
                  unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung,
                  Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes
                  bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
                </p>
              </div>
            </div>
          </Card>

          {/* Footer Links */}
          <div className="flex gap-4 text-sm text-muted-foreground pt-4">
            <Link href="/privacy" className="hover:text-foreground">
              Datenschutzerklärung
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Nutzungsbedingungen
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
