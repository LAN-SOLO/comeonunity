import { z } from 'zod'

export const memberRoleEnum = z.enum(['admin', 'moderator', 'member'])

export const memberStatusEnum = z.enum(['active', 'inactive', 'pending', 'suspended'])

export const updateMemberProfileSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  unitNumber: z.string().max(20).optional(),
  phone: z.string().max(20).optional(),
  showPhone: z.boolean().default(false),
  showEmail: z.boolean().default(true),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  skills: z.array(z.string().max(50)).max(10).optional(),
  skillsDescription: z.string().max(500).optional(),
  availableForHelp: z.boolean().default(true),
})

export const adminUpdateMemberSchema = z.object({
  memberId: z.string().uuid(),
  action: z.enum(['suspend', 'activate', 'remove', 'change_role']),
  role: memberRoleEnum.optional(),
  reason: z.string().max(500).optional(),
})

export const memberSearchSchema = z.object({
  query: z.string().max(100).optional(),
  skills: z.array(z.string()).optional(),
  availableForHelp: z.boolean().optional(),
  role: memberRoleEnum.optional(),
  status: memberStatusEnum.optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
})

// Predefined skill categories
export const skillCategories = [
  'Handwerk & Reparatur',
  'Garten & Pflanzen',
  'Kochen & Backen',
  'Kinderbetreuung',
  'Haustierbetreuung',
  'IT & Technik',
  'Sprachen & Übersetzung',
  'Nachhilfe & Bildung',
  'Sport & Fitness',
  'Musik & Kunst',
  'Haushaltshilfe',
  'Einkaufen & Besorgungen',
  'Fahrdienste',
  'Verwaltung & Büro',
  'Gesundheit & Pflege',
  'Sonstiges',
] as const

export type MemberRole = z.infer<typeof memberRoleEnum>
export type MemberStatus = z.infer<typeof memberStatusEnum>
export type UpdateMemberProfileInput = z.infer<typeof updateMemberProfileSchema>
export type AdminUpdateMemberInput = z.infer<typeof adminUpdateMemberSchema>
export type MemberSearchInput = z.infer<typeof memberSearchSchema>
