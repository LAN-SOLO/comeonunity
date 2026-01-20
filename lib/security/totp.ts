import { generateSecret, verify, generateURI } from 'otplib'
import QRCode from 'qrcode'

/**
 * Generate a new TOTP secret
 */
export function generateTOTPSecret(): string {
  return generateSecret()
}

/**
 * Verify a TOTP token against a secret
 * Uses a tolerance of 30 seconds (1 period) for clock drift
 */
export async function verifyTOTP(token: string, secret: string): Promise<boolean> {
  // Verify with 30 second tolerance for clock drift
  const result = await verify({
    token,
    secret,
    epochTolerance: 30, // Allow 30 seconds tolerance
  })
  return result.valid
}

/**
 * Generate a TOTP URI and QR code for authenticator apps
 */
export async function generateTOTPUri(
  secret: string,
  email: string
): Promise<{ uri: string; qrCode: string }> {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'ComeOnUnity'

  const uri = generateURI({
    secret,
    issuer: appName,
    label: email,
    algorithm: 'sha1',
    digits: 6,
    period: 30,
  })

  const qrCode = await QRCode.toDataURL(uri)

  return { uri, qrCode }
}

/**
 * Generate recovery codes for backup access
 */
export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = []
  // Use alphanumeric characters (excluding similar-looking ones: 0, O, I, 1, L)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

  for (let i = 0; i < count; i++) {
    // Generate 8-character recovery codes
    const code = Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
    codes.push(code)
  }

  return codes
}

/**
 * Verify a recovery code (case-insensitive)
 */
export function verifyRecoveryCode(
  inputCode: string,
  validCodes: string[]
): { valid: boolean; index: number } {
  const normalizedInput = inputCode.toUpperCase().replace(/\s/g, '')
  const index = validCodes.findIndex(
    (code) => code.toUpperCase() === normalizedInput
  )

  return {
    valid: index !== -1,
    index,
  }
}
