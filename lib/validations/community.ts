import { z } from 'zod'

export const communityTypeEnum = z.enum([
  'weg',
  'house',
  'neighborhood',
  'cohousing',
  'interest',
])

export const communityPlanEnum = z.enum([
  'free',
  'starter',
  'community',
  'pro',
])

export const createCommunitySchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be at most 100 characters'),
  type: communityTypeEnum,
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional().default('DE'),
  locale: z.enum(['en', 'de']).optional().default('de'),
  timezone: z.string().optional().default('Europe/Berlin'),
})

export const updateCommunitySchema = createCommunitySchema.partial()

export const inviteSchema = z.object({
  email: z.string().email().optional(),
  maxUses: z.number().min(1).max(100).default(10),
  expiresInDays: z.number().min(1).max(30).default(7),
})

export const joinCommunitySchema = z.object({
  inviteCode: z
    .string()
    .min(6, 'Invalid invite code')
    .max(20, 'Invalid invite code'),
})

export const communitySettingsSchema = z.object({
  requireApproval: z.boolean().default(false),
  allowPublicProfile: z.boolean().default(true),
  defaultMemberRole: z.enum(['member', 'moderator']).default('member'),
  notificationPreferences: z.object({
    newMembers: z.boolean().default(true),
    newItems: z.boolean().default(true),
    newNews: z.boolean().default(true),
    bookings: z.boolean().default(true),
  }).optional(),
})

export type CommunityType = z.infer<typeof communityTypeEnum>
export type CommunityPlan = z.infer<typeof communityPlanEnum>
export type CreateCommunityInput = z.input<typeof createCommunitySchema>
export type CreateCommunityOutput = z.infer<typeof createCommunitySchema>
export type UpdateCommunityInput = z.input<typeof updateCommunitySchema>
export type InviteInput = z.input<typeof inviteSchema>
export type JoinCommunityInput = z.infer<typeof joinCommunitySchema>
export type CommunitySettingsInput = z.infer<typeof communitySettingsSchema>
