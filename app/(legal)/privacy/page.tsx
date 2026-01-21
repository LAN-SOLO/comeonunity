import { Metadata } from 'next'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Shield, Database, Globe, Lock, Users, Bell, Trash2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung | ComeOnUnity',
  description: 'Datenschutzerklärung und Informationen zum Umgang mit Ihren Daten bei ComeOnUnity',
}

export default function PrivacyPage() {
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

        <h1 className="text-3xl font-bold mb-2">Datenschutzerklärung</h1>
        <p className="text-muted-foreground mb-8">Stand: Januar 2026</p>

        <div className="space-y-8">
          {/* Overview */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">1. Datenschutz auf einen Blick</h2>
            </div>

            <div className="text-muted-foreground space-y-4">
              <div>
                <h3 className="font-medium text-foreground mb-2">Allgemeine Hinweise</h3>
                <p>
                  Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren
                  personenbezogenen Daten passiert, wenn Sie diese Website besuchen.
                  Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert
                  werden können.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-2">Datenerfassung auf dieser Website</h3>
                <p className="mb-2">
                  <strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong>
                </p>
                <p>
                  Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber.
                  Dessen Kontaktdaten können Sie dem Abschnitt &quot;Hinweis zur Verantwortlichen Stelle&quot;
                  in dieser Datenschutzerklärung entnehmen.
                </p>
              </div>
            </div>
          </Card>

          {/* Responsible Party */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">2. Verantwortliche Stelle</h2>
            </div>

            <div className="text-muted-foreground space-y-4">
              <p>Verantwortlich für die Datenverarbeitung auf dieser Website ist:</p>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="font-medium text-foreground">artnorama UG (haftungsbeschränkt)</p>
                <p>Traute-Lafrenz-Straße 106</p>
                <p>22297 Hamburg</p>
                <p>Deutschland</p>
                <p className="mt-2">
                  E-Mail:{' '}
                  <a href="mailto:datenschutz@comeonunity.app" className="text-primary hover:underline">
                    datenschutz@comeonunity.app
                  </a>
                </p>
              </div>
              <p>
                Verantwortliche Stelle ist die natürliche oder juristische Person, die allein oder
                gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von
                personenbezogenen Daten entscheidet.
              </p>
            </div>
          </Card>

          {/* Data Collection */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">3. Datenerfassung auf dieser Website</h2>
            </div>

            <div className="text-muted-foreground space-y-6">
              <div>
                <h3 className="font-medium text-foreground mb-2">Cookies</h3>
                <p className="mb-2">
                  Unsere Internetseiten verwenden so genannte &quot;Cookies&quot;. Cookies sind kleine
                  Datenpakete und richten auf Ihrem Endgerät keinen Schaden an. Sie werden entweder
                  vorübergehend für die Dauer einer Sitzung (Session-Cookies) oder dauerhaft
                  (permanente Cookies) auf Ihrem Endgerät gespeichert.
                </p>
                <p className="mb-2">
                  <strong>Notwendige Cookies:</strong> Diese Cookies sind für den Betrieb der Website
                  erforderlich (z.B. Session-Cookies, Authentifizierung).
                </p>
                <p className="mb-2">
                  <strong>Funktionale Cookies:</strong> Diese Cookies ermöglichen erweiterte
                  Funktionen wie Spracheinstellungen.
                </p>
                <p className="mb-2">
                  <strong>Analyse-Cookies:</strong> Diese Cookies helfen uns, die Nutzung der
                  Website zu verstehen und zu verbessern.
                </p>
                <p>
                  Sie können über unseren Cookie-Banner selbst entscheiden, welche Cookies Sie
                  zulassen möchten.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-2">Server-Log-Dateien</h3>
                <p className="mb-2">
                  Der Provider der Seiten erhebt und speichert automatisch Informationen in so
                  genannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt.
                  Dies sind:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Browsertyp und Browserversion</li>
                  <li>Verwendetes Betriebssystem</li>
                  <li>Referrer URL</li>
                  <li>Hostname des zugreifenden Rechners</li>
                  <li>Uhrzeit der Serveranfrage</li>
                  <li>IP-Adresse</li>
                </ul>
                <p className="mt-2">
                  Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen.
                  Grundlage für die Datenverarbeitung ist Art. 6 Abs. 1 lit. f DSGVO.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-2">Registrierung und Nutzerkonto</h3>
                <p className="mb-2">
                  Bei der Registrierung für ein Nutzerkonto erheben wir folgende Daten:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>E-Mail-Adresse</li>
                  <li>Passwort (verschlüsselt gespeichert)</li>
                  <li>Name (optional)</li>
                  <li>Profilbild (optional)</li>
                  <li>Weitere freiwillige Profilangaben</li>
                </ul>
                <p className="mt-2">
                  Die Verarbeitung erfolgt auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a
                  DSGVO) und zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).
                </p>
              </div>
            </div>
          </Card>

          {/* Hosting */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">4. Hosting und Content Delivery Networks</h2>
            </div>

            <div className="text-muted-foreground space-y-4">
              <div>
                <h3 className="font-medium text-foreground mb-2">Externes Hosting</h3>
                <p>
                  Diese Website wird bei einem externen Dienstleister gehostet. Die
                  personenbezogenen Daten, die auf dieser Website erfasst werden, werden auf den
                  Servern des Hosters gespeichert. Hierbei kann es sich v.a. um IP-Adressen,
                  Kontaktanfragen, Meta- und Kommunikationsdaten, Vertragsdaten, Kontaktdaten,
                  Namen, Websitezugriffe und sonstige Daten, die über eine Website generiert
                  werden, handeln.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-2">Supabase</h3>
                <p>
                  Wir nutzen Supabase als Backend-as-a-Service für Authentifizierung und
                  Datenspeicherung. Supabase verarbeitet Daten in der EU. Weitere Informationen
                  finden Sie in der Datenschutzerklärung von Supabase:{' '}
                  <a
                    href="https://supabase.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    https://supabase.com/privacy
                  </a>
                </p>
              </div>
            </div>
          </Card>

          {/* Your Rights */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">5. Ihre Rechte</h2>
            </div>

            <div className="text-muted-foreground space-y-4">
              <p>Sie haben jederzeit das Recht:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="font-medium text-foreground min-w-[140px]">Auskunft:</span>
                  <span>
                    Auskunft über Ihre bei uns gespeicherten personenbezogenen Daten zu verlangen
                    (Art. 15 DSGVO)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-foreground min-w-[140px]">Berichtigung:</span>
                  <span>
                    Die Berichtigung unrichtiger personenbezogener Daten zu verlangen (Art. 16 DSGVO)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-foreground min-w-[140px]">Löschung:</span>
                  <span>
                    Die Löschung Ihrer bei uns gespeicherten personenbezogenen Daten zu verlangen
                    (Art. 17 DSGVO)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-foreground min-w-[140px]">Einschränkung:</span>
                  <span>
                    Die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen
                    (Art. 18 DSGVO)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-foreground min-w-[140px]">Datenübertragbarkeit:</span>
                  <span>
                    Ihre personenbezogenen Daten in einem strukturierten, gängigen und
                    maschinenlesbaren Format zu erhalten (Art. 20 DSGVO)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-foreground min-w-[140px]">Widerspruch:</span>
                  <span>
                    Der Verarbeitung Ihrer personenbezogenen Daten zu widersprechen (Art. 21 DSGVO)
                  </span>
                </li>
              </ul>
            </div>
          </Card>

          {/* Data Deletion */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Trash2 className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">6. Datenlöschung</h2>
            </div>

            <div className="text-muted-foreground space-y-4">
              <p>
                Ihre personenbezogenen Daten werden gelöscht oder gesperrt, sobald der Zweck der
                Speicherung entfällt. Eine Speicherung kann darüber hinaus erfolgen, wenn dies
                durch den europäischen oder nationalen Gesetzgeber vorgesehen wurde.
              </p>
              <p>
                Sie können Ihr Konto und alle damit verbundenen Daten jederzeit in den
                Kontoeinstellungen löschen. Nach der Löschung werden Ihre Daten innerhalb von 30
                Tagen vollständig aus unseren Systemen entfernt.
              </p>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">7. E-Mail-Benachrichtigungen</h2>
            </div>

            <div className="text-muted-foreground space-y-4">
              <p>
                Wenn Sie sich für ein Konto registrieren, können Sie E-Mail-Benachrichtigungen
                erhalten. Diese können Sie jederzeit in Ihren Kontoeinstellungen deaktivieren.
              </p>
              <p>
                Die Verarbeitung erfolgt auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a
                DSGVO).
              </p>
            </div>
          </Card>

          {/* Security */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">8. Datensicherheit</h2>
            <div className="text-muted-foreground space-y-4">
              <p>
                Wir verwenden innerhalb des Website-Besuchs das verbreitete SSL-Verfahren (Secure
                Socket Layer) in Verbindung mit der jeweils höchsten Verschlüsselungsstufe, die
                von Ihrem Browser unterstützt wird.
              </p>
              <p>
                Wir bedienen uns geeigneter technischer und organisatorischer
                Sicherheitsmaßnahmen, um Ihre Daten gegen zufällige oder vorsätzliche
                Manipulationen, teilweisen oder vollständigen Verlust, Zerstörung oder gegen den
                unbefugten Zugriff Dritter zu schützen.
              </p>
            </div>
          </Card>

          {/* Changes */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">9. Änderung dieser Datenschutzerklärung</h2>
            <p className="text-muted-foreground">
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den
              aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen
              in der Datenschutzerklärung umzusetzen. Für Ihren erneuten Besuch gilt dann die
              neue Datenschutzerklärung.
            </p>
          </Card>

          {/* Contact for Privacy */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">10. Fragen zum Datenschutz</h2>
            <div className="text-muted-foreground">
              <p className="mb-4">
                Wenn Sie Fragen zum Datenschutz haben, schreiben Sie uns bitte eine E-Mail:
              </p>
              <a
                href="mailto:datenschutz@comeonunity.app"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                datenschutz@comeonunity.app
              </a>
            </div>
          </Card>

          {/* Footer Links */}
          <div className="flex gap-4 text-sm text-muted-foreground pt-4">
            <Link href="/imprint" className="hover:text-foreground">
              Impressum
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
