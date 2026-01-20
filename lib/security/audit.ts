import { headers } from 'next/headers'

// Audit action types
export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.2fa_enabled'
  | 'auth.2fa_disabled'
  | 'auth.password_change'
  | 'auth.password_reset'
  | 'member.invite'
  | 'member.join'
  | 'member.suspend'
  | 'member.activate'
  | 'member.remove'
  | 'member.role_change'
  | 'item.create'
  | 'item.update'
  | 'item.delete'
  | 'item.flag'
  | 'booking.create'
  | 'booking.cancel'
  | 'news.create'
  | 'news.update'
  | 'news.delete'
  | 'news.flag'
  | 'community.create'
  | 'community.update'
  | 'community.suspend'
  | 'community.delete'
  | 'admin.user_suspend'
  | 'admin.user_activate'
  | 'admin.user_delete'
  | 'admin.community_suspend'
  | 'admin.settings_update'
  | 'data.export_request'
  | 'data.account_delete'
  | 'report.create'
  | 'report.resolve'

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical'

interface AuditLogParams {
  userId?: string
  userEmail?: string
  communityId?: string
  action: AuditAction
  resourceType: string
  resourceId?: string
  details?: Record<string, unknown>
  previousState?: Record<string, unknown>
  newState?: Record<string, unknown>
  severity?: AuditSeverity
}

/**
 * Create an audit log entry
 * Note: This function requires the admin Supabase client to bypass RLS
 */
export async function createAuditLog(params: AuditLogParams) {
  // Dynamic import to avoid circular dependencies
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const supabase = createAdminClient()

  // Get request headers for IP and user agent
  const headersList = await headers()

  const ipAddress =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'

  const { error } = await supabase.from('audit_logs').insert({
    user_id: params.userId,
    user_email: params.userEmail,
    ip_address: ipAddress,
    user_agent: userAgent,
    community_id: params.communityId,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    details: params.details,
    previous_state: params.previousState,
    new_state: params.newState,
    severity: params.severity || 'info',
  })

  if (error) {
    console.error('Failed to create audit log:', error)
  }
}

/**
 * Log a security-related event with elevated severity
 */
export async function logSecurityEvent(
  action: AuditAction,
  params: Omit<AuditLogParams, 'action' | 'severity'>
) {
  await createAuditLog({
    ...params,
    action,
    severity: 'warning',
  })
}

/**
 * Format audit action for display
 */
export function formatAuditAction(action: AuditAction): string {
  const map: Record<AuditAction, string> = {
    'auth.login': 'User logged in',
    'auth.logout': 'User logged out',
    'auth.2fa_enabled': '2FA enabled',
    'auth.2fa_disabled': '2FA disabled',
    'auth.password_change': 'Password changed',
    'auth.password_reset': 'Password reset',
    'member.invite': 'Member invited',
    'member.join': 'Member joined',
    'member.suspend': 'Member suspended',
    'member.activate': 'Member activated',
    'member.remove': 'Member removed',
    'member.role_change': 'Member role changed',
    'item.create': 'Item created',
    'item.update': 'Item updated',
    'item.delete': 'Item deleted',
    'item.flag': 'Item flagged',
    'booking.create': 'Booking created',
    'booking.cancel': 'Booking cancelled',
    'news.create': 'News posted',
    'news.update': 'News updated',
    'news.delete': 'News deleted',
    'news.flag': 'News flagged',
    'community.create': 'Community created',
    'community.update': 'Community updated',
    'community.suspend': 'Community suspended',
    'community.delete': 'Community deleted',
    'admin.user_suspend': 'User suspended (admin)',
    'admin.user_activate': 'User activated (admin)',
    'admin.user_delete': 'User deleted (admin)',
    'admin.community_suspend': 'Community suspended (admin)',
    'admin.settings_update': 'Settings updated (admin)',
    'data.export_request': 'Data export requested',
    'data.account_delete': 'Account deletion requested',
    'report.create': 'Report created',
    'report.resolve': 'Report resolved',
  }

  return map[action] || action
}
