import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Users,
  Package,
  Calendar,
  Newspaper,
  Shield,
  ArrowRight,
} from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If logged in, redirect to app
  if (user) {
    // Check if user has any communities
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">ComeOnUnity</span>
          </div>
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
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Connect Your Community
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          The modern platform for neighborhoods and residential communities.
          Share resources, coordinate activities, and build stronger connections with your neighbors.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/signup">
              Create Your Community
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/communities/join">Join with Invite Code</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">
          Everything Your Community Needs
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold mb-2">Member Directory</h3>
            <p className="text-sm text-muted-foreground">
              Connect with neighbors, share skills, and find help when you need it.
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold mb-2">Lending Library</h3>
            <p className="text-sm text-muted-foreground">
              Share tools, equipment, and items with your community members.
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold mb-2">Space Booking</h3>
            <p className="text-sm text-muted-foreground">
              Reserve shared spaces like BBQ areas, meeting rooms, and more.
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Newspaper className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-semibold mb-2">News & Updates</h3>
            <p className="text-sm text-muted-foreground">
              Stay informed with community announcements and important updates.
            </p>
          </Card>
        </div>
      </section>

      {/* Security Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <Card className="p-8 md:p-12 bg-primary/5 border-primary/20">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold mb-2">Private & Secure</h3>
              <p className="text-muted-foreground">
                Your community data is protected with enterprise-grade security.
                Invite-only access ensures only verified members can join.
                Two-factor authentication available for extra protection.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">
          Ready to Get Started?
        </h2>
        <p className="text-muted-foreground mb-8">
          Create your community in minutes. No credit card required.
        </p>
        <Button size="lg" asChild>
          <Link href="/signup">
            Create Your Community
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ComeOnUnity. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
