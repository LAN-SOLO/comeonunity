import { z } from 'zod'

export const resourceTypeEnum = z.enum([
  'room',
  'vehicle',
  'equipment',
  'space',
  'other',
])

export const resourceStatusEnum = z.enum([
  'active',
  'maintenance',
  'retired',
])

export const bookingTypeEnum = z.enum([
  'slot',
  'day',
  'flexible',
])

export const bookingStatusEnum = z.enum([
  'pending',
  'confirmed',
  'cancelled',
])

export const createResourceSchema = z.object({
  name: z.string().min(2).max(100),
  nameEn: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  type: resourceTypeEnum,
  images: z.array(z.string().url()).max(5).optional(),
  bookingType: bookingTypeEnum.default('slot'),
  slotDurationMinutes: z.number().min(15).max(480).default(60),
  minAdvanceHours: z.number().min(0).max(168).default(1),
  maxAdvanceDays: z.number().min(1).max(365).default(30),
  maxDurationHours: z.number().min(1).max(168).optional(),
  availableDays: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5, 6, 0]),
  availableFrom: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format').default('08:00'),
  availableUntil: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format').default('22:00'),
  requiresApproval: z.boolean().default(false),
  rules: z.string().max(2000).optional(),
  capacity: z.number().min(1).optional(),
})

export const updateResourceSchema = createResourceSchema.partial()

export const createBookingSchema = z.object({
  resourceId: z.string().uuid(),
  startsAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid start time',
  }),
  endsAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid end time',
  }),
  title: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  attendees: z.number().min(1).optional(),
}).refine(
  (data) => new Date(data.endsAt) > new Date(data.startsAt),
  {
    message: 'End time must be after start time',
    path: ['endsAt'],
  }
)

export const cancelBookingSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().max(500).optional(),
})

export const availabilityQuerySchema = z.object({
  resourceId: z.string().uuid(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date',
  }),
})

export const bookingSearchSchema = z.object({
  resourceId: z.string().uuid().optional(),
  memberId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: bookingStatusEnum.optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
})

// Resource type labels for display
export const resourceTypeLabels: Record<z.infer<typeof resourceTypeEnum>, { en: string; de: string }> = {
  room: { en: 'Room', de: 'Raum' },
  vehicle: { en: 'Vehicle', de: 'Fahrzeug' },
  equipment: { en: 'Equipment', de: 'Ausrüstung' },
  space: { en: 'Space', de: 'Fläche' },
  other: { en: 'Other', de: 'Sonstiges' },
}

export type ResourceType = z.infer<typeof resourceTypeEnum>
export type ResourceStatus = z.infer<typeof resourceStatusEnum>
export type BookingType = z.infer<typeof bookingTypeEnum>
export type BookingStatus = z.infer<typeof bookingStatusEnum>
export type CreateResourceInput = z.infer<typeof createResourceSchema>
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>
export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>
export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>
export type BookingSearchInput = z.infer<typeof bookingSearchSchema>
