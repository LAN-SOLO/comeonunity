import { getResendClient, getFromEmail, isEmailConfigured } from './resend'
import { NotificationEmail, notificationTemplates } from './templates/notification'
import { InviteEmail } from './templates/invite'
import { renderEmail } from './templates/base'
import { createAdminClient } from '@/lib/supabase/admin'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  tags?: { name: string; value: string }[]
}

/**
 * Send an email using Resend
 */
async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn('Email not configured, skipping send')
    return false
  }

  try {
    const resend = getResendClient()
    const { error } = await resend.emails.send({
      from: getFromEmail(),
      to: options.to,
      subject: options.subject,
      html: options.html,
      tags: options.tags,
    })

    if (error) {
      console.error('Failed to send email:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Email send error:', error)
    return false
  }
}

/**
 * Check if user has email notifications enabled
 */
async function shouldSendEmail(userId: string): Promise<boolean> {
  try {
    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('email_notifications')
      .eq('id', userId)
      .single()

    return profile?.email_notifications !== false
  } catch (error) {
    console.error('Failed to check email preferences:', error)
    return true // Default to sending
  }
}

/**
 * Get user email from auth
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const adminClient = createAdminClient()
    const { data } = await adminClient.auth.admin.getUserById(userId)
    return data?.user?.email || null
  } catch (error) {
    console.error('Failed to get user email:', error)
    return null
  }
}

// =============================================================================
// HIGH-LEVEL EMAIL FUNCTIONS
// =============================================================================

/**
 * Send a notification email to a user
 */
export async function sendNotificationEmail(
  userId: string,
  options: {
    title: string
    message: string
    actionUrl?: string
    actionText?: string
    communityName?: string
  }
): Promise<boolean> {
  // Check preferences
  if (!(await shouldSendEmail(userId))) {
    return false
  }

  // Get email
  const email = await getUserEmail(userId)
  if (!email) {
    return false
  }

  // Render and send
  const html = renderEmail(
    NotificationEmail({
      title: options.title,
      message: options.message,
      actionUrl: options.actionUrl,
      actionText: options.actionText,
      communityName: options.communityName,
    })
  )

  return sendEmail({
    to: email,
    subject: options.title,
    html,
    tags: [{ name: 'type', value: 'notification' }],
  })
}

/**
 * Send a community invite email
 */
export async function sendInviteEmail(
  toEmail: string,
  options: {
    inviterName: string
    communityName: string
    communityDescription?: string
    inviteUrl: string
    expiresAt?: Date
  }
): Promise<boolean> {
  const html = renderEmail(
    InviteEmail({
      inviterName: options.inviterName,
      communityName: options.communityName,
      communityDescription: options.communityDescription,
      inviteUrl: options.inviteUrl,
      expiresAt: options.expiresAt?.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    })
  )

  return sendEmail({
    to: toEmail,
    subject: `You're invited to join ${options.communityName}`,
    html,
    tags: [{ name: 'type', value: 'invite' }],
  })
}

/**
 * Send a member joined notification to admins
 */
export async function notifyMemberJoined(
  communityId: string,
  memberName: string
): Promise<void> {
  try {
    const adminClient = createAdminClient()

    // Get community info
    const { data: community } = await adminClient
      .from('communities')
      .select('name')
      .eq('id', communityId)
      .single()

    if (!community) return

    // Get admin members
    const { data: admins } = await adminClient
      .from('community_members')
      .select('user_id')
      .eq('community_id', communityId)
      .eq('role', 'admin')
      .eq('status', 'active')

    if (!admins || admins.length === 0) return

    const template = notificationTemplates.memberJoined(
      memberName,
      community.name,
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://comeonunity.app'}/c/${communityId}/members`
    )

    // Send to all admins
    for (const admin of admins) {
      await sendNotificationEmail(admin.user_id, template)
    }
  } catch (error) {
    console.error('Failed to send member joined notification:', error)
  }
}

/**
 * Send a borrow request notification to item owner
 */
export async function notifyBorrowRequest(
  itemId: string,
  borrowerName: string
): Promise<void> {
  try {
    const adminClient = createAdminClient()

    // Get item with owner info
    const { data: item } = await adminClient
      .from('items')
      .select(`
        name,
        community_id,
        owner:owner_id(user_id)
      `)
      .eq('id', itemId)
      .single()

    if (!item || !item.owner) return

    // Get community name
    const { data: community } = await adminClient
      .from('communities')
      .select('name')
      .eq('id', item.community_id)
      .single()

    if (!community) return

    const template = notificationTemplates.itemBorrowed(
      item.name,
      borrowerName,
      community.name,
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://comeonunity.app'}/c/${item.community_id}/items/${itemId}`
    )

    await sendNotificationEmail((item.owner as any).user_id, template)
  } catch (error) {
    console.error('Failed to send borrow request notification:', error)
  }
}

/**
 * Send a new event notification to community members
 */
export async function notifyNewEvent(
  communityId: string,
  eventId: string,
  eventTitle: string,
  eventDate: Date
): Promise<void> {
  try {
    const adminClient = createAdminClient()

    // Get community name
    const { data: community } = await adminClient
      .from('communities')
      .select('name')
      .eq('id', communityId)
      .single()

    if (!community) return

    // Get all active members
    const { data: members } = await adminClient
      .from('community_members')
      .select('user_id')
      .eq('community_id', communityId)
      .eq('status', 'active')

    if (!members || members.length === 0) return

    const template = notificationTemplates.newEvent(
      eventTitle,
      community.name,
      eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://comeonunity.app'}/c/${communityId}/calendar/${eventId}`
    )

    // Send to all members (in batches to avoid rate limits)
    const batchSize = 10
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize)
      await Promise.all(
        batch.map((member) => sendNotificationEmail(member.user_id, template))
      )
    }
  } catch (error) {
    console.error('Failed to send new event notification:', error)
  }
}
