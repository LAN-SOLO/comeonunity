// Audit action types - client-safe, can be imported anywhere
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

export interface AuditLogParams {
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
 * Format audit action for display - client-safe utility
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
