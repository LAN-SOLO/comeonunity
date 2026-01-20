import { Resend } from 'resend'

let resendClient: Resend | null = null

/**
 * Get or create the Resend client singleton
 */
export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    resendClient = new Resend(apiKey)
  }

  return resendClient
}

/**
 * Default sender email address
 */
export function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'ComeOnUnity <noreply@comeonunity.app>'
}

/**
 * Check if email is configured
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}
