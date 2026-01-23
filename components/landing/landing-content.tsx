'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Package,
  Calendar,
  Newspaper,
  Shield,
  ArrowRight,
  Check,
  MessageSquare,
  BarChart3,
  Palette,
  ShoppingBag,
  Bell,
  Lock,
  Globe,
  Zap,
  Clock,
  Building2,
} from 'lucide-react'
import { LogoText } from '@/components/brand/logo-text'
import { SUBSCRIPTION_TIERS, formatPrice } from '@/lib/stripe/config'
import { LanguageProvider, useLanguage } from '@/lib/i18n/language-context'
import { LanguageSwitcher } from '@/components/language-switcher'

function LandingPageContent() {
  const { t } = useLanguage()

  const features = [
    { icon: Users, titleKey: 'memberDirectory' as const, color: 'blue' },
    { icon: Package, titleKey: 'lendingLibrary' as const, color: 'green' },
    { icon: Calendar, titleKey: 'resourceBooking' as const, color: 'purple' },
    { icon: Newspaper, titleKey: 'newsAnnouncements' as const, color: 'amber' },
    { icon: Bell, titleKey: 'smartNotifications' as const, color: 'red' },
    { icon: MessageSquare, titleKey: 'communityPolls' as const, color: 'teal' },
    { icon: BarChart3, titleKey: 'analyticsDashboard' as const, color: 'indigo' },
    { icon: ShoppingBag, titleKey: 'marketplace' as const, color: 'pink' },
  ]

  const colorClasses: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', icon: 'text-blue-600 dark:text-blue-400' },
    green: { bg: 'bg-green-100 dark:bg-green-900/30', icon: 'text-green-600 dark:text-green-400' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', icon: 'text-purple-600 dark:text-purple-400' },
    amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', icon: 'text-amber-600 dark:text-amber-400' },
    red: { bg: 'bg-red-100 dark:bg-red-900/30', icon: 'text-red-600 dark:text-red-400' },
    teal: { bg: 'bg-teal-100 dark:bg-teal-900/30', icon: 'text-teal-600 dark:text-teal-400' },
    indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', icon: 'text-indigo-600 dark:text-indigo-400' },
    pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', icon: 'text-pink-600 dark:text-pink-400' },
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <LogoText size="md" />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t.nav.features}
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t.nav.pricing}
            </a>
            <a href="#security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t.nav.security}
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" asChild>
              <Link href="/login">{t.nav.signIn}</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">{t.nav.getStarted}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 text-center">
        <Badge variant="secondary" className="mb-6">
          <Zap className="h-3 w-3 mr-1" />
          {t.hero.badge}
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          {t.hero.title}
          <span className="text-primary block">{t.hero.titleHighlight}</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          {t.hero.description}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild className="text-base">
            <Link href="/signup">
              {t.hero.ctaPrimary}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="text-base">
            <Link href="/communities/join">{t.hero.ctaSecondary}</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          {t.hero.noCreditCard}
        </p>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">{t.features.title}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t.features.description}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const colors = colorClasses[feature.color]
            const Icon = feature.icon
            const featureText = t.features.items[feature.titleKey]
            return (
              <Card key={feature.titleKey} className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center mx-auto mb-4`}>
                  <Icon className={`h-6 w-6 ${colors.icon}`} />
                </div>
                <h3 className="font-semibold mb-2">{featureText.title}</h3>
                <p className="text-sm text-muted-foreground">{featureText.description}</p>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-muted/50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{t.pricing.title}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t.pricing.description}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {SUBSCRIPTION_TIERS.map((tier) => (
              <Card key={tier.id} className={tier.popular ? 'border-primary shadow-lg' : ''}>
                <CardHeader className="text-center pb-4">
                  <div className="h-6 mb-2 flex items-center justify-center">
                    {tier.popular && <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>}
                  </div>
                  <CardTitle className="text-xl">{tier.displayName}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{formatPrice(tier.priceAnnual)}</span>
                    <span className="text-muted-foreground">{t.pricing.perYear}</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t.pricing.or} {formatPrice(tier.priceMonthly)}{t.pricing.perMonth}
                    </p>
                  </div>
                  <ul className="space-y-3 text-sm text-left mb-6">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{t.pricing.upToMembers.replace('{count}', String(tier.limits.maxMembers))}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{t.pricing.sharedItems.replace('{count}', String(tier.limits.maxItems))}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{t.pricing.bookableResources.replace('{count}', String(tier.limits.maxResources))}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span>
                        {tier.limits.maxAdmins > 1 
                          ? t.pricing.adminsPlural.replace('{count}', String(tier.limits.maxAdmins))
                          : t.pricing.admins.replace('{count}', String(tier.limits.maxAdmins))}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{t.pricing.storage.replace('{amount}', tier.limits.maxStorageMb >= 1024 ? `${tier.limits.maxStorageMb / 1024} GB` : `${tier.limits.maxStorageMb} MB`)}</span>
                    </li>
                    {tier.features.events && (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span>{t.pricing.eventsCalendar}</span>
                      </li>
                    )}
                    {tier.features.polls && (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span>{t.pricing.pollsVoting}</span>
                      </li>
                    )}
                    {tier.features.documents && (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span>{t.pricing.documentSharing}</span>
                      </li>
                    )}
                    {tier.features.messaging && (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span>{t.pricing.directMessaging}</span>
                      </li>
                    )}
                    {tier.features.customBranding && (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span>{t.pricing.customBranding}</span>
                      </li>
                    )}
                    {tier.features.prioritySupport && (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span>{t.pricing.prioritySupport}</span>
                      </li>
                    )}
                  </ul>
                  <Button className="w-full" variant={tier.popular ? 'default' : 'outline'} asChild>
                    <Link href="/signup">{t.pricing.startFreeTrial}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">{t.pricing.addOnsNote}</p>
        </div>
      </section>

      {/* Add-ons Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold mb-4">{t.addons.title}</h2>
          <p className="text-muted-foreground">{t.addons.description}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {[
            { icon: Users, name: t.addons.members, price: '3' },
            { icon: Package, name: t.addons.items, price: '2' },
            { icon: Calendar, name: t.addons.resources, price: '3' },
            { icon: ShoppingBag, name: t.addons.marketplace, price: '5' },
            { icon: Palette, name: t.addons.branding, price: '10' },
          ].map((addon) => (
            <Card key={addon.name} className="p-4 text-center">
              <addon.icon className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <div className="font-medium text-sm">{addon.name}</div>
              <div className="text-xs text-muted-foreground">{addon.price}/year</div>
            </Card>
          ))}
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">{t.security.title}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t.security.description}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <Lock className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">{t.security.twoFactor.title}</h3>
            <p className="text-sm text-muted-foreground">{t.security.twoFactor.description}</p>
          </Card>
          <Card className="p-6">
            <Shield className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">{t.security.inviteOnly.title}</h3>
            <p className="text-sm text-muted-foreground">{t.security.inviteOnly.description}</p>
          </Card>
          <Card className="p-6">
            <Globe className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">{t.security.gdpr.title}</h3>
            <p className="text-sm text-muted-foreground">{t.security.gdpr.description}</p>
          </Card>
          <Card className="p-6">
            <Clock className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">{t.security.auditLogs.title}</h3>
            <p className="text-sm text-muted-foreground">{t.security.auditLogs.description}</p>
          </Card>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="bg-muted/50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{t.useCases.title}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="p-6">
              <Building2 className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold mb-2">{t.useCases.apartment.title}</h3>
              <p className="text-sm text-muted-foreground">{t.useCases.apartment.description}</p>
            </Card>
            <Card className="p-6">
              <Users className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold mb-2">{t.useCases.hoa.title}</h3>
              <p className="text-sm text-muted-foreground">{t.useCases.hoa.description}</p>
            </Card>
            <Card className="p-6">
              <Package className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold mb-2">{t.useCases.cohousing.title}</h3>
              <p className="text-sm text-muted-foreground">{t.useCases.cohousing.description}</p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">{t.cta.title}</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">{t.cta.description}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild className="text-base">
            <Link href="/signup">
              {t.cta.button}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-4">{t.cta.noCreditCard}</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid gap-8 md:grid-cols-4 mb-8">
            <div>
              <LogoText size="sm" />
              <p className="text-sm text-muted-foreground mt-2">{t.footer.tagline}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">{t.footer.product}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">{t.nav.features}</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">{t.nav.pricing}</a></li>
                <li><a href="#security" className="hover:text-foreground transition-colors">{t.nav.security}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">{t.footer.legal}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">{t.footer.privacyPolicy}</Link></li>
                <li><Link href="/imprint" className="hover:text-foreground transition-colors">{t.footer.imprint}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">{t.footer.getStarted}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/signup" className="hover:text-foreground transition-colors">{t.footer.createCommunity}</Link></li>
                <li><Link href="/communities/join" className="hover:text-foreground transition-colors">{t.footer.joinCommunity}</Link></li>
                <li><Link href="/login" className="hover:text-foreground transition-colors">{t.nav.signIn}</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} ComeOnUnity. {t.footer.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export function LandingContent() {
  return (
    <LanguageProvider>
      <LandingPageContent />
    </LanguageProvider>
  )
}
