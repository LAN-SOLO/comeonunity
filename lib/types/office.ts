/**
 * Office Module Types - ComeOnUnity v3
 *
 * Types for desk booking, floor plans, meeting rooms, parking, and visitors
 */

// ============================================================================
// FLOOR PLANS
// ============================================================================

export interface FloorPlan {
  id: string
  community_id: string
  name: string
  floor_number: number
  svg_data: string | null
  image_url: string | null
  width: number
  height: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateFloorPlanInput {
  name: string
  floor_number: number
  svg_data?: string
  image_url?: string
  width?: number
  height?: number
}

export interface UpdateFloorPlanInput extends Partial<CreateFloorPlanInput> {
  is_active?: boolean
}

// ============================================================================
// DESKS
// ============================================================================

export type DeskEquipment =
  | 'monitor'
  | 'dual_monitor'
  | 'docking_station'
  | 'standing_desk'
  | 'ergonomic_chair'
  | 'phone'
  | 'webcam'
  | 'headset'

export type DeskStatus = 'available' | 'occupied' | 'maintenance' | 'reserved'

export interface Desk {
  id: string
  floor_plan_id: string | null
  community_id: string
  name: string
  desk_number: string | null
  position_x: number
  position_y: number
  width: number
  height: number
  rotation: number
  equipment: DeskEquipment[]
  is_bookable: boolean
  is_assigned: boolean
  assigned_to: string | null
  status: DeskStatus
  created_at: string
  updated_at: string
}

export interface DeskWithAssignee extends Desk {
  assignee?: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
}

export interface CreateDeskInput {
  floor_plan_id?: string
  name: string
  desk_number?: string
  position_x: number
  position_y: number
  width?: number
  height?: number
  rotation?: number
  equipment?: DeskEquipment[]
  is_bookable?: boolean
}

export interface UpdateDeskInput extends Partial<CreateDeskInput> {
  status?: DeskStatus
  is_assigned?: boolean
  assigned_to?: string | null
}

// ============================================================================
// DESK BOOKINGS
// ============================================================================

export type DeskBookingStatus =
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export interface DeskBooking {
  id: string
  desk_id: string
  community_id: string
  member_id: string
  booking_date: string // YYYY-MM-DD
  start_time: string | null // HH:MM:SS
  end_time: string | null
  is_full_day: boolean
  status: DeskBookingStatus
  check_in_at: string | null
  check_out_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DeskBookingWithDetails extends DeskBooking {
  desk: {
    id: string
    name: string
    desk_number: string | null
    floor_plan_id: string | null
  }
  member: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
}

export interface CreateDeskBookingInput {
  desk_id: string
  booking_date: string
  start_time?: string
  end_time?: string
  is_full_day?: boolean
  notes?: string
}

export interface UpdateDeskBookingInput {
  status?: DeskBookingStatus
  notes?: string
}

// ============================================================================
// MEETING ROOMS
// ============================================================================

export type RoomEquipment =
  | 'projector'
  | 'tv_screen'
  | 'whiteboard'
  | 'video_conferencing'
  | 'phone'
  | 'webcam'
  | 'microphone'

export type RoomAmenity = 'coffee' | 'water' | 'snacks' | 'catering_available'

export interface MeetingRoom {
  id: string
  floor_plan_id: string | null
  community_id: string
  name: string
  description: string | null
  capacity: number
  position_x: number | null
  position_y: number | null
  width: number
  height: number
  equipment: RoomEquipment[]
  amenities: RoomAmenity[]
  hourly_rate: number
  min_booking_minutes: number
  max_booking_minutes: number
  advance_booking_days: number
  buffer_minutes: number
  requires_approval: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateMeetingRoomInput {
  floor_plan_id?: string
  name: string
  description?: string
  capacity: number
  position_x?: number
  position_y?: number
  width?: number
  height?: number
  equipment?: RoomEquipment[]
  amenities?: RoomAmenity[]
  hourly_rate?: number
  min_booking_minutes?: number
  max_booking_minutes?: number
  advance_booking_days?: number
  buffer_minutes?: number
  requires_approval?: boolean
}

export interface UpdateMeetingRoomInput extends Partial<CreateMeetingRoomInput> {
  is_active?: boolean
}

// ============================================================================
// ROOM BOOKINGS
// ============================================================================

export type RoomBookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface ExternalAttendee {
  name: string
  email?: string
  company?: string
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  interval: number
  days?: number[] // 0-6 for weekly (0 = Sunday)
  until: string // YYYY-MM-DD
}

export interface RoomBooking {
  id: string
  room_id: string
  community_id: string
  member_id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  attendees: string[] // community member IDs
  external_attendees: ExternalAttendee[]
  status: RoomBookingStatus
  recurring_pattern: RecurringPattern | null
  parent_booking_id: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
}

export interface RoomBookingWithDetails extends RoomBooking {
  room: {
    id: string
    name: string
    capacity: number
    floor_plan_id: string | null
  }
  member: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
}

export interface CreateRoomBookingInput {
  room_id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  attendees?: string[]
  external_attendees?: ExternalAttendee[]
  recurring_pattern?: RecurringPattern
}

export interface UpdateRoomBookingInput {
  title?: string
  description?: string
  start_time?: string
  end_time?: string
  attendees?: string[]
  external_attendees?: ExternalAttendee[]
  status?: RoomBookingStatus
  cancellation_reason?: string
}

// ============================================================================
// PARKING SPOTS
// ============================================================================

export type ParkingSpotType =
  | 'standard'
  | 'handicap'
  | 'ev_charging'
  | 'motorcycle'
  | 'compact'
  | 'reserved'

export interface ParkingSpot {
  id: string
  community_id: string
  spot_number: string
  location: string | null
  type: ParkingSpotType
  is_bookable: boolean
  is_assigned: boolean
  assigned_to: string | null
  monthly_rate: number
  daily_rate: number
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ParkingSpotWithAssignee extends ParkingSpot {
  assignee?: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
}

export interface CreateParkingSpotInput {
  spot_number: string
  location?: string
  type?: ParkingSpotType
  is_bookable?: boolean
  monthly_rate?: number
  daily_rate?: number
  notes?: string
}

export interface UpdateParkingSpotInput extends Partial<CreateParkingSpotInput> {
  is_active?: boolean
  is_assigned?: boolean
  assigned_to?: string | null
}

// ============================================================================
// PARKING BOOKINGS
// ============================================================================

export type ParkingBookingStatus = 'confirmed' | 'cancelled' | 'completed'

export interface ParkingBooking {
  id: string
  spot_id: string
  community_id: string
  member_id: string
  booking_date: string
  vehicle_plate: string | null
  vehicle_description: string | null
  status: ParkingBookingStatus
  created_at: string
}

export interface CreateParkingBookingInput {
  spot_id: string
  booking_date: string
  vehicle_plate?: string
  vehicle_description?: string
}

// ============================================================================
// VISITORS
// ============================================================================

export type VisitorStatus =
  | 'expected'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show'

export interface Visitor {
  id: string
  community_id: string
  host_member_id: string
  visitor_name: string
  visitor_email: string | null
  visitor_phone: string | null
  visitor_company: string | null
  visit_date: string
  expected_arrival: string | null
  expected_departure: string | null
  purpose: string | null
  meeting_room_id: string | null
  status: VisitorStatus
  check_in_at: string | null
  check_out_at: string | null
  checked_in_by: string | null
  badge_number: string | null
  photo_url: string | null
  nda_signed: boolean
  nda_signed_at: string | null
  wifi_access_granted: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface VisitorWithHost extends Visitor {
  host: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
  meeting_room?: {
    id: string
    name: string
  } | null
}

export interface CreateVisitorInput {
  visitor_name: string
  visitor_email?: string
  visitor_phone?: string
  visitor_company?: string
  visit_date: string
  expected_arrival?: string
  expected_departure?: string
  purpose?: string
  meeting_room_id?: string
  notes?: string
}

export interface UpdateVisitorInput extends Partial<CreateVisitorInput> {
  status?: VisitorStatus
  badge_number?: string
  nda_signed?: boolean
  wifi_access_granted?: boolean
}

// ============================================================================
// WORK LOCATIONS
// ============================================================================

export type LocationType = 'office' | 'home' | 'travel' | 'off' | 'sick' | 'vacation'

export interface WorkLocation {
  id: string
  member_id: string
  community_id: string
  date: string
  location_type: LocationType
  desk_id: string | null
  floor_plan_id: string | null
  arrival_time: string | null
  departure_time: string | null
  notes: string | null
  is_visible: boolean
  created_at: string
  updated_at: string
}

export interface WorkLocationWithMember extends WorkLocation {
  member: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
  desk?: {
    id: string
    name: string
    floor_plan_id: string | null
  } | null
}

export interface CreateWorkLocationInput {
  date: string
  location_type: LocationType
  desk_id?: string
  floor_plan_id?: string
  arrival_time?: string
  departure_time?: string
  notes?: string
  is_visible?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Placeholder for future extension
export interface UpdateWorkLocationInput extends Partial<CreateWorkLocationInput> {}

// ============================================================================
// OFFICE SETTINGS
// ============================================================================

export interface OfficeSettings {
  check_in_required: boolean
  auto_checkout_time: string | null // HH:MM
  visitor_wifi_ssid: string | null
  visitor_wifi_password: string | null
  visitor_nda_url: string | null
  default_desk_booking_hours: {
    start: string // HH:MM
    end: string
  }
  allow_advance_desk_booking_days: number
  require_desk_check_in: boolean
  no_show_cancellation_minutes: number
}

export const defaultOfficeSettings: OfficeSettings = {
  check_in_required: false,
  auto_checkout_time: '18:00',
  visitor_wifi_ssid: null,
  visitor_wifi_password: null,
  visitor_nda_url: null,
  default_desk_booking_hours: {
    start: '09:00',
    end: '18:00',
  },
  allow_advance_desk_booking_days: 14,
  require_desk_check_in: false,
  no_show_cancellation_minutes: 30,
}

// ============================================================================
// AVAILABILITY TYPES
// ============================================================================

export interface DeskAvailability {
  desk_id: string
  desk_name: string
  booking_date: string
  is_available: boolean
  booked_by: string | null
}

export interface RoomTimeSlot {
  start_time: string
  end_time: string
  is_available: boolean
  booking_id?: string
  booking_title?: string
}

export interface RoomAvailability {
  room_id: string
  room_name: string
  date: string
  slots: RoomTimeSlot[]
}

// ============================================================================
// TEAM CALENDAR TYPES
// ============================================================================

export interface TeamMemberLocation {
  member_id: string
  display_name: string | null
  avatar_url: string | null
  date: string
  location_type: LocationType
  desk_name: string | null
  floor_name: string | null
  arrival_time: string | null
  departure_time: string | null
}

export interface TeamCalendarDay {
  date: string
  members: TeamMemberLocation[]
  desk_bookings_count: number
  room_bookings_count: number
  visitors_count: number
}
