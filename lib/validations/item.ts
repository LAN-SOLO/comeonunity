import { z } from 'zod'

export const itemCategoryEnum = z.enum([
  'tools',
  'sports',
  'electronics',
  'kitchen',
  'garden',
  'kids',
  'party',
  'transport',
  'books',
  'games',
  'other',
])

export const itemStatusEnum = z.enum([
  'available',
  'borrowed',
  'unavailable',
  'damaged',
])

export const itemConditionEnum = z.enum([
  'new',
  'excellent',
  'good',
  'fair',
  'worn',
])

export const borrowStatusEnum = z.enum([
  'pending',
  'approved',
  'declined',
  'active',
  'returned',
  'overdue',
])

export const createItemSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  nameEn: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  category: itemCategoryEnum,
  images: z.array(z.string().url()).max(5).optional(),
  condition: itemConditionEnum.default('good'),
  requiresApproval: z.boolean().default(true),
  maxBorrowDays: z.number().min(1).max(90).default(7),
  depositAmount: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
  pickupLocation: z.string().max(200).optional(),
})

export const updateItemSchema = createItemSchema.partial()

export const borrowRequestSchema = z.object({
  itemId: z.string().uuid(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid start date',
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid end date',
  }),
  message: z.string().max(500).optional(),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
)

export const borrowResponseSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(['approve', 'decline']),
  response: z.string().max(500).optional(),
})

export const returnItemSchema = z.object({
  requestId: z.string().uuid(),
  condition: itemConditionEnum,
  notes: z.string().max(500).optional(),
})

export const flagItemSchema = z.object({
  itemId: z.string().uuid(),
  reason: z.enum(['spam', 'harassment', 'inappropriate', 'dangerous', 'other']),
  description: z.string().max(500).optional(),
})

export const itemSearchSchema = z.object({
  query: z.string().max(100).optional(),
  category: itemCategoryEnum.optional(),
  status: itemStatusEnum.optional(),
  ownerId: z.string().uuid().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
})

// Item category labels for display
export const itemCategoryLabels: Record<z.infer<typeof itemCategoryEnum>, { en: string; de: string }> = {
  tools: { en: 'Tools', de: 'Werkzeuge' },
  sports: { en: 'Sports & Outdoors', de: 'Sport & Outdoor' },
  electronics: { en: 'Electronics', de: 'Elektronik' },
  kitchen: { en: 'Kitchen', de: 'Küche' },
  garden: { en: 'Garden', de: 'Garten' },
  kids: { en: 'Kids & Baby', de: 'Kinder & Baby' },
  party: { en: 'Party & Events', de: 'Party & Events' },
  transport: { en: 'Transport', de: 'Transport' },
  books: { en: 'Books & Media', de: 'Bücher & Medien' },
  games: { en: 'Games & Toys', de: 'Spiele & Spielzeug' },
  other: { en: 'Other', de: 'Sonstiges' },
}

export type ItemCategory = z.infer<typeof itemCategoryEnum>
export type ItemStatus = z.infer<typeof itemStatusEnum>
export type ItemCondition = z.infer<typeof itemConditionEnum>
export type BorrowStatus = z.infer<typeof borrowStatusEnum>
export type CreateItemInput = z.infer<typeof createItemSchema>
export type UpdateItemInput = z.infer<typeof updateItemSchema>
export type BorrowRequestInput = z.infer<typeof borrowRequestSchema>
export type BorrowResponseInput = z.infer<typeof borrowResponseSchema>
export type ReturnItemInput = z.infer<typeof returnItemSchema>
export type FlagItemInput = z.infer<typeof flagItemSchema>
export type ItemSearchInput = z.infer<typeof itemSearchSchema>
