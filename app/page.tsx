import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
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
  Headphones,
  Code,
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

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If logged in, redirect to app
  if (user) {
    const { data: memberships } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)

    if (memberships && memberships.length > 0) {
      redirect(`/c/${memberships[0].community_id}`)
    } else {
      redirect('/communities/new')
    }
  }

  const features = [
    {
      icon: Users,
      title: 'Member Directory',
      description: 'Connect with neighbors, share skills, and find help when you need it.',
      color: 'blue',
    },
    {
      icon: Package,
      title: 'Lending Library',
      description: 'Share tools, equipment, and household items with your community.',
      color: 'green',
    },
    {
      icon: Calendar,
      title: 'Resource Booking',
      description: 'Reserve shared spaces like BBQ areas, meeting rooms, laundry, and more.',
      color: 'purple',
    },
    {
      icon: Newspaper,
      title: 'News & Announcements',
      description: 'Stay informed with community news, updates, and important notices.',
      color: 'amber',
    },
    {
      icon: Bell,
      title: 'Smart Notifications',
      description: 'Get notified about bookings, messages, and community updates.',
      color: 'red',
    },
    {
      icon: MessageSquare,
      title: 'Community Polls',
      description: 'Make decisions together with easy-to-use voting and polls.',
      color: 'teal',
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'Track community engagement, usage statistics, and growth.',
      color: 'indigo',
    },
    {
      icon: ShoppingBag,
      title: 'Marketplace',
      description: 'Buy, sell, and trade items within your trusted community.',
      color: 'pink',
    },
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
              Features
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="#security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Security
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 text-center">
        <Badge variant="secondary" className="mb-6">
          <Zap className="h-3 w-3 mr-1" />
          14-day free trial on all plans
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          The Modern Platform for
          <span className="text-primary block">Neighborhood Communities</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Share resources, coordinate activities, and build stronger connections with your neighbors.
          Everything your residential community needs in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild className="text-base">
            <Link href="/signup">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="text-base">
            <Link href="/communities/join">Join with Invite Code</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          No credit card required. Cancel anytime.
        </p>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            Everything Your Community Needs
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From sharing tools to booking spaces, ComeOnUnity has all the features
            to make your neighborhood thrive.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const colors = colorClasses[feature.color]
            const Icon = feature.icon
            return (
              <Card key={feature.title} className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center mx-auto mb-4`}>
                  <Icon className={`h-6 w-6 ${colors.icon}`} />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-muted/50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your community. All plans include a 14-day free trial.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {SUBSCRIPTION_TIERS.map((tier) => (
              <Card
                key={tier.id}
                className={`relative ${tier.popular ? 'border-primary shadow-lg scale-105' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl">{tier.displayName}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{formatPrice(tier.priceAnnual)}</span>
                    <span className="text-muted-foreground">/year</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      or {formatPrice(tier.priceMonthly)}/month
                    </p>
                  </div>
                  <ul className="space-y-3 text-sm text-left mb-6">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span>Up to {tier.limits.maxMembers} members</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{tier.limits.maxItems} shared items</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{tier.limits.maxResources} bookable resources</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{tier.limits.maxAdmins} admin{tier.limits.maxAdmins > 1 ? 's' : ''}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{tier.limits.maxStorageMb >= 1024 ? `${tier.limits.maxStorageMb / 1024} GB` : `${tier.limits.maxStorageMb} MB`} storage</span>
                    </li>
                    {tier.features.events && (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span>Events & Calendar</span>
                      </li>
                    )}
                    {tier.features.polls && (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span>Polls & Voting</span>
                      </li>
                    )}
                    {tier.features.documents && (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span>Document Sharing</span>
                      </li>
                    )}
                    {tier.features.messaging && (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span>Direct Messaging</span>
                      </li>
                    )}
                    {tier.features.customBranding && (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span>Custom Branding</span>
                      </li>
                    )}
                    {tier.features.prioritySupport && (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span>Priority Support</span>
                      </li>
                    )}
                  </ul>
                  <Button
                    className="w-full"
                    variant={tier.popular ? 'default' : 'outline'}
                    asChild
                  >
                    <Link href="/signup">Start Free Trial</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            Need more capacity? Add extra members, items, or resources with our flexible add-ons.
          </p>
        </div>
      </section>

      {/* Add-ons Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold mb-4">Flexible Add-ons</h2>
          <p className="text-muted-foreground">Extend your plan with additional capacity and features</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {[
            { icon: Users, name: '+10 Members', price: '3' },
            { icon: Package, name: '+20 Items', price: '2' },
            { icon: Calendar, name: '+5 Resources', price: '3' },
            { icon: ShoppingBag, name: 'Marketplace', price: '5' },
            { icon: Palette, name: 'Custom Branding', price: '10' },
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
          <h2 className="text-3xl font-bold mb-4">
            Enterprise-Grade Security
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your community data is protected with the highest security standards.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <Lock className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">Two-Factor Auth</h3>
            <p className="text-sm text-muted-foreground">
              Protect accounts with TOTP-based two-factor authentication.
            </p>
          </Card>
          <Card className="p-6">
            <Shield className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">Invite-Only Access</h3>
            <p className="text-sm text-muted-foreground">
              Only verified members can join your private community.
            </p>
          </Card>
          <Card className="p-6">
            <Globe className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">GDPR Compliant</h3>
            <p className="text-sm text-muted-foreground">
              Full compliance with European data protection regulations.
            </p>
          </Card>
          <Card className="p-6">
            <Clock className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2">Audit Logs</h3>
            <p className="text-sm text-muted-foreground">
              Complete activity logs for transparency and accountability.
            </p>
          </Card>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="bg-muted/50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Perfect For Any Community
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="p-6">
              <Building2 className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Apartment Buildings</h3>
              <p className="text-sm text-muted-foreground">
                Coordinate shared amenities, building maintenance, and neighbor interactions.
              </p>
            </Card>
            <Card className="p-6">
              <Users className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold mb-2">HOA Communities</h3>
              <p className="text-sm text-muted-foreground">
                Manage common areas, share announcements, and facilitate resident communication.
              </p>
            </Card>
            <Card className="p-6">
              <Package className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Co-Housing Groups</h3>
              <p className="text-sm text-muted-foreground">
                Share resources, coordinate meals, and manage shared spaces efficiently.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">
          Ready to Transform Your Community?
        </h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
          Join hundreds of communities already using ComeOnUnity to connect, share, and thrive together.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild className="text-base">
            <Link href="/signup">
              Start Your 14-Day Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          No credit card required. Full access to all features.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid gap-8 md:grid-cols-4 mb-8">
            <div>
              <LogoText size="sm" />
              <p className="text-sm text-muted-foreground mt-2">
                The modern platform for neighborhood communities.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#security" className="hover:text-foreground transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="/imprint" className="hover:text-foreground transition-colors">Imprint</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Get Started</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/signup" className="hover:text-foreground transition-colors">Create Community</Link></li>
                <li><Link href="/communities/join" className="hover:text-foreground transition-colors">Join Community</Link></li>
                <li><Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} ComeOnUnity. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
