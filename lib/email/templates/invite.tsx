import * as React from 'react'
import { BaseEmail } from './base'

interface InviteEmailProps {
  inviterName: string
  communityName: string
  communityDescription?: string
  inviteUrl: string
  expiresAt?: string
}

export function InviteEmail({
  inviterName,
  communityName,
  communityDescription,
  inviteUrl,
  expiresAt,
}: InviteEmailProps) {
  return (
    <BaseEmail previewText={`${inviterName} invited you to join ${communityName}`}>
      <h1>You&apos;re invited!</h1>
      <p>
        <strong>{inviterName}</strong> has invited you to join{' '}
        <strong>{communityName}</strong> on ComeOnUnity.
      </p>
      {communityDescription && (
        <p style={{ fontStyle: 'italic', color: '#71717a' }}>
          &quot;{communityDescription}&quot;
        </p>
      )}
      <p>
        ComeOnUnity is a platform for community sharing and collaboration. Join to
        share items, participate in events, and connect with your community.
      </p>
      <p style={{ textAlign: 'center', marginTop: 32 }}>
        <a href={inviteUrl} className="button">
          Accept Invitation
        </a>
      </p>
      {expiresAt && (
        <p className="text-muted" style={{ textAlign: 'center', marginTop: 16 }}>
          This invitation expires on {expiresAt}
        </p>
      )}
      <hr className="divider" />
      <p className="text-muted">
        If you don&apos;t want to join this community, you can safely ignore this email.
      </p>
    </BaseEmail>
  )
}
