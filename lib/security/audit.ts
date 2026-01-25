import { headers } from 'next/headers'
import type { AuditAction, AuditLogParams } from './audit-types'

// Re-export types and client-safe utilities for convenience
export { type AuditAction, type AuditSeverity, type AuditLogParams, formatAuditAction } from './audit-types'

/**
 * Create an audit log entry
 * Note: This function requires the admin Supabase client to bypass RLS
 * SERVER-ONLY - Do not import this in client components
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
 * SERVER-ONLY - Do not import this in client components
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
