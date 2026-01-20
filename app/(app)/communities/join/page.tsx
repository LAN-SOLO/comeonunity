'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  Loader2,
  Building2,
  Users,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

interface InviteInfo {
  id: string
  code: string
  community: {
    id: string
    name: string
    description: string | null
    type: string
    logo_url: string | null
  }
  expiresAt: string | null
  remainingUses: number | null
}

export default function JoinCommunityPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get('code')

  const [code, setCode] = useState(codeFromUrl || '')
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  // Check code when it changes
  useEffect(() => {
    if (code.length >= 6) {
      checkInviteCode(code)
    } else {
      setInvite(null)
      setError(null)
    }
  }, [code])

  const checkInviteCode = async (inviteCode: string) => {
    setIsChecking(true)
    setError(null)

    try {
      const { data: inviteData, error: inviteError } = await supabase
        .from('invites')
        .select(`
          id,
          code,
          max_uses,
          uses,
          expires_at,
          community:communities (
            id,
            name,
            description,
            type,
            logo_url
          )
        `)
        .eq('code', inviteCode.toUpperCase())
        .single()

      if (inviteError || !inviteData) {
        setError('Invalid invite code')
        setInvite(null)
        return
      }

      // Check if expired
      if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
        setError('This invite has expired')
        setInvite(null)
        return
      }

      // Check if max uses reached
      if (inviteData.max_uses > 0 && inviteData.uses >= inviteData.max_uses) {
        setError('This invite has reached its maximum uses')
        setInvite(null)
        return
      }

      // Check if user is already a member
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: existingMember } = await supabase
          .from('community_members')
          .select('id, status')
          .eq('community_id', (inviteData.community as any).id)
          .eq('user_id', user.id)
          .single()

        if (existingMember) {
          if (existingMember.status === 'active') {
            setError('You are already a member of this community')
          } else if (existingMember.status === 'suspended') {
            setError('Your membership in this community has been suspended')
          }
          setInvite(null)
          return
        }
      }

      setInvite({
        id: inviteData.id,
        code: inviteData.code,
        community: inviteData.community as any,
        expiresAt: inviteData.expires_at,
        remainingUses: inviteData.max_uses > 0 ? inviteData.max_uses - inviteData.uses : null,
      })
    } catch (err) {
      console.error('Failed to check invite:', err)
      setError('Failed to verify invite code')
    } finally {
      setIsChecking(false)
    }
  }

  const handleJoin = async () => {
    if (!invite) return

    setIsLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be logged in to join a community')
      }

      // Add member
      const { error: memberError } = await supabase
        .from('community_members')
        .insert({
          community_id: invite.community.id,
          user_id: user.id,
          role: 'member',
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Member',
          status: 'active',
        })

      if (memberError) {
        throw memberError
      }

      // Increment invite uses
      await supabase
        .from('invites')
        .update({ uses: (await supabase.from('invites').select('uses').eq('id', invite.id).single()).data?.uses + 1 })
        .eq('id', invite.id)

      setSuccess(true)

      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/c/${invite.community.id}`)
      }, 2000)
    } catch (err: any) {
      console.error('Failed to join community:', err)
      setError(err.message || 'Failed to join community. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const typeLabels: Record<string, string> = {
    weg: 'WEG',
    house: 'House Community',
    neighborhood: 'Neighborhood',
    cohousing: 'Co-Housing',
    interest: 'Interest Group',
  }

  if (success) {
    return (
      <div className="p-6 lg:p-8 max-w-md mx-auto">
        <Card className="p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-green" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Welcome!</h2>
          <p className="text-muted-foreground mb-4">
            You've successfully joined {invite?.community.name}. Redirecting to your new community...
          </p>
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-md mx-auto">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Join a Community</h1>
        <p className="text-muted-foreground mt-1">
          Enter an invite code to join an existing community
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="code">Invite Code</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter invite code"
            className="text-center text-lg tracking-wider font-mono uppercase"
            disabled={isLoading}
          />
          {isChecking && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Checking invite...
            </p>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {invite && (
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-14 w-14 rounded-xl">
                {invite.community.logo_url ? (
                  <AvatarImage src={invite.community.logo_url} />
                ) : null}
                <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-xl">
                  {invite.community.name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{invite.community.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {typeLabels[invite.community.type] || invite.community.type}
                </p>
              </div>
            </div>

            {invite.community.description && (
              <p className="text-sm text-muted-foreground mb-4">
                {invite.community.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
              {invite.expiresAt && (
                <span>
                  Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                </span>
              )}
              {invite.remainingUses !== null && (
                <span>{invite.remainingUses} uses remaining</span>
              )}
            </div>

            <Button
              onClick={handleJoin}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Join Community
                </>
              )}
            </Button>
          </div>
        )}

        <div className="text-center pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">
            Don't have an invite code?
          </p>
          <Button variant="outline" asChild>
            <Link href="/communities/new">
              <Building2 className="mr-2 h-4 w-4" />
              Create Your Own Community
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
