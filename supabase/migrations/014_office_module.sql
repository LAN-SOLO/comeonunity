-- Migration: 014_office_module.sql
-- Description: Add Office community type with desk booking, floor plans, meeting rooms, parking, and visitors
-- Version: 3.0

-- ============================================================================
-- OFFICE MODULE TABLES
-- ============================================================================

-- Add 'office' to community types
ALTER TABLE communities
  DROP CONSTRAINT IF EXISTS communities_type_check;

ALTER TABLE communities
  ADD CONSTRAINT communities_type_check
  CHECK (type IN ('weg', 'house', 'neighborhood', 'cohousing', 'interest', 'office'));

-- ----------------------------------------------------------------------------
-- Floor Plans
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  floor_number INTEGER NOT NULL DEFAULT 0,
  svg_data TEXT, -- SVG floor plan data
  image_url TEXT, -- Uploaded floor plan image
  width INTEGER DEFAULT 1000,
  height INTEGER DEFAULT 800,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_floor_plans_community ON floor_plans(community_id);
CREATE INDEX IF NOT EXISTS idx_floor_plans_active ON floor_plans(community_id, is_active);

-- ----------------------------------------------------------------------------
-- Desks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS desks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID REFERENCES floor_plans(id) ON DELETE SET NULL,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  desk_number TEXT,
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER DEFAULT 60,
  height INTEGER DEFAULT 40,
  rotation INTEGER DEFAULT 0, -- degrees
  equipment JSONB DEFAULT '[]'::jsonb, -- ["monitor", "docking_station", "standing_desk"]
  is_bookable BOOLEAN DEFAULT true,
  is_assigned BOOLEAN DEFAULT false,
  assigned_to UUID REFERENCES community_members(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_desks_community ON desks(community_id);
CREATE INDEX IF NOT EXISTS idx_desks_floor_plan ON desks(floor_plan_id);
CREATE INDEX IF NOT EXISTS idx_desks_assigned ON desks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_desks_bookable ON desks(community_id, is_bookable, status);

-- ----------------------------------------------------------------------------
-- Desk Bookings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS desk_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desk_id UUID NOT NULL REFERENCES desks(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME, -- NULL means full day
  end_time TIME,
  is_full_day BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'checked_in', 'completed', 'cancelled', 'no_show')),
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent double booking
  CONSTRAINT unique_desk_booking UNIQUE (desk_id, booking_date, start_time)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_desk_bookings_community ON desk_bookings(community_id);
CREATE INDEX IF NOT EXISTS idx_desk_bookings_desk ON desk_bookings(desk_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_desk_bookings_member ON desk_bookings(member_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_desk_bookings_date ON desk_bookings(booking_date, status);

-- ----------------------------------------------------------------------------
-- Meeting Rooms
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meeting_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID REFERENCES floor_plans(id) ON DELETE SET NULL,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER NOT NULL DEFAULT 6,
  position_x INTEGER,
  position_y INTEGER,
  width INTEGER DEFAULT 100,
  height INTEGER DEFAULT 80,
  equipment JSONB DEFAULT '[]'::jsonb, -- ["projector", "whiteboard", "video_conferencing", "phone"]
  amenities JSONB DEFAULT '[]'::jsonb, -- ["coffee", "water", "snacks"]
  hourly_rate DECIMAL(10,2) DEFAULT 0,
  min_booking_minutes INTEGER DEFAULT 30,
  max_booking_minutes INTEGER DEFAULT 480, -- 8 hours
  advance_booking_days INTEGER DEFAULT 30,
  buffer_minutes INTEGER DEFAULT 0, -- time between bookings for cleanup
  requires_approval BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_rooms_community ON meeting_rooms(community_id);
CREATE INDEX IF NOT EXISTS idx_meeting_rooms_floor_plan ON meeting_rooms(floor_plan_id);
CREATE INDEX IF NOT EXISTS idx_meeting_rooms_active ON meeting_rooms(community_id, is_active);

-- ----------------------------------------------------------------------------
-- Room Bookings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES meeting_rooms(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  attendees UUID[] DEFAULT '{}', -- community member IDs
  external_attendees JSONB DEFAULT '[]'::jsonb, -- [{name, email, company}]
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  recurring_pattern JSONB, -- {frequency: "weekly", interval: 1, days: [1,3,5], until: "2024-12-31"}
  parent_booking_id UUID REFERENCES room_bookings(id) ON DELETE CASCADE, -- for recurring instances
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES community_members(id),
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure end > start
  CONSTRAINT valid_room_booking_times CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_room_bookings_community ON room_bookings(community_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_room ON room_bookings(room_id, start_time);
CREATE INDEX IF NOT EXISTS idx_room_bookings_member ON room_bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_time ON room_bookings(start_time, end_time, status);
CREATE INDEX IF NOT EXISTS idx_room_bookings_recurring ON room_bookings(parent_booking_id) WHERE parent_booking_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Parking Spots
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parking_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  spot_number TEXT NOT NULL,
  location TEXT, -- e.g., "Underground Level 1", "Building A"
  type TEXT DEFAULT 'standard' CHECK (type IN ('standard', 'handicap', 'ev_charging', 'motorcycle', 'compact', 'reserved')),
  is_bookable BOOLEAN DEFAULT true,
  is_assigned BOOLEAN DEFAULT false,
  assigned_to UUID REFERENCES community_members(id) ON DELETE SET NULL,
  monthly_rate DECIMAL(10,2) DEFAULT 0,
  daily_rate DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parking_spots_community ON parking_spots(community_id);
CREATE INDEX IF NOT EXISTS idx_parking_spots_bookable ON parking_spots(community_id, is_bookable, is_active);
CREATE INDEX IF NOT EXISTS idx_parking_spots_assigned ON parking_spots(assigned_to) WHERE assigned_to IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Parking Bookings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parking_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES parking_spots(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  vehicle_plate TEXT,
  vehicle_description TEXT, -- "Blue Tesla Model 3"
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_parking_booking UNIQUE (spot_id, booking_date)
);

CREATE INDEX IF NOT EXISTS idx_parking_bookings_community ON parking_bookings(community_id);
CREATE INDEX IF NOT EXISTS idx_parking_bookings_spot ON parking_bookings(spot_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_parking_bookings_member ON parking_bookings(member_id, booking_date);

-- ----------------------------------------------------------------------------
-- Visitors
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  host_member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  visitor_email TEXT,
  visitor_phone TEXT,
  visitor_company TEXT,
  visit_date DATE NOT NULL,
  expected_arrival TIME,
  expected_departure TIME,
  purpose TEXT, -- "Meeting", "Interview", "Delivery", "Tour"
  meeting_room_id UUID REFERENCES meeting_rooms(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'expected' CHECK (status IN ('expected', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES community_members(id), -- reception/admin
  badge_number TEXT,
  photo_url TEXT, -- visitor photo taken at check-in
  nda_signed BOOLEAN DEFAULT false,
  nda_signed_at TIMESTAMPTZ,
  wifi_access_granted BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitors_community ON visitors(community_id);
CREATE INDEX IF NOT EXISTS idx_visitors_host ON visitors(host_member_id);
CREATE INDEX IF NOT EXISTS idx_visitors_date ON visitors(visit_date, status);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors(community_id, status, visit_date);

-- ----------------------------------------------------------------------------
-- Work Locations (Team Visibility / Where Everyone Is)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('office', 'home', 'travel', 'off', 'sick', 'vacation')),
  desk_id UUID REFERENCES desks(id) ON DELETE SET NULL,
  floor_plan_id UUID REFERENCES floor_plans(id) ON DELETE SET NULL,
  arrival_time TIME,
  departure_time TIME,
  notes TEXT,
  is_visible BOOLEAN DEFAULT true, -- allow users to hide their location
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, date)
);

CREATE INDEX IF NOT EXISTS idx_work_locations_community ON work_locations(community_id, date);
CREATE INDEX IF NOT EXISTS idx_work_locations_member ON work_locations(member_id, date);
CREATE INDEX IF NOT EXISTS idx_work_locations_date ON work_locations(date, location_type);

-- ============================================================================
-- OFFICE SETTINGS IN COMMUNITY
-- ============================================================================

-- Add office-specific settings to communities
COMMENT ON COLUMN communities.settings IS 'JSON settings including office config: {office: {check_in_required, auto_checkout_time, visitor_wifi_ssid, visitor_nda_url, default_desk_booking_hours}}';

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Floor Plans RLS
ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY floor_plans_select ON floor_plans FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = floor_plans.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.status = 'active'
  ));

CREATE POLICY floor_plans_insert ON floor_plans FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = floor_plans.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.role IN ('admin', 'moderator')
    AND community_members.status = 'active'
  ));

CREATE POLICY floor_plans_update ON floor_plans FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = floor_plans.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.role IN ('admin', 'moderator')
    AND community_members.status = 'active'
  ));

CREATE POLICY floor_plans_delete ON floor_plans FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = floor_plans.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.role = 'admin'
    AND community_members.status = 'active'
  ));

-- Desks RLS
ALTER TABLE desks ENABLE ROW LEVEL SECURITY;

CREATE POLICY desks_select ON desks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = desks.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.status = 'active'
  ));

CREATE POLICY desks_insert ON desks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = desks.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.role IN ('admin', 'moderator')
    AND community_members.status = 'active'
  ));

CREATE POLICY desks_update ON desks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = desks.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.role IN ('admin', 'moderator')
    AND community_members.status = 'active'
  ));

CREATE POLICY desks_delete ON desks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = desks.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.role = 'admin'
    AND community_members.status = 'active'
  ));

-- Desk Bookings RLS
ALTER TABLE desk_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY desk_bookings_select ON desk_bookings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = desk_bookings.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.status = 'active'
  ));

CREATE POLICY desk_bookings_insert ON desk_bookings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = desk_bookings.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.status = 'active'
  ));

CREATE POLICY desk_bookings_update ON desk_bookings FOR UPDATE
  USING (
    -- Own booking or admin/moderator
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = desk_bookings.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.status = 'active'
      AND (
        community_members.id = desk_bookings.member_id
        OR community_members.role IN ('admin', 'moderator')
      )
    )
  );

CREATE POLICY desk_bookings_delete ON desk_bookings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = desk_bookings.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.status = 'active'
      AND (
        community_members.id = desk_bookings.member_id
        OR community_members.role IN ('admin', 'moderator')
      )
    )
  );

-- Meeting Rooms RLS
ALTER TABLE meeting_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY meeting_rooms_select ON meeting_rooms FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = meeting_rooms.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.status = 'active'
  ));

CREATE POLICY meeting_rooms_insert ON meeting_rooms FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = meeting_rooms.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.role IN ('admin', 'moderator')
    AND community_members.status = 'active'
  ));

CREATE POLICY meeting_rooms_update ON meeting_rooms FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = meeting_rooms.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.role IN ('admin', 'moderator')
    AND community_members.status = 'active'
  ));

CREATE POLICY meeting_rooms_delete ON meeting_rooms FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = meeting_rooms.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.role = 'admin'
    AND community_members.status = 'active'
  ));

-- Room Bookings RLS
ALTER TABLE room_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY room_bookings_select ON room_bookings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = room_bookings.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.status = 'active'
  ));

CREATE POLICY room_bookings_insert ON room_bookings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = room_bookings.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.status = 'active'
  ));

CREATE POLICY room_bookings_update ON room_bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = room_bookings.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.status = 'active'
      AND (
        community_members.id = room_bookings.member_id
        OR community_members.role IN ('admin', 'moderator')
      )
    )
  );

CREATE POLICY room_bookings_delete ON room_bookings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = room_bookings.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.status = 'active'
      AND (
        community_members.id = room_bookings.member_id
        OR community_members.role IN ('admin', 'moderator')
      )
    )
  );

-- Parking Spots RLS
ALTER TABLE parking_spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY parking_spots_select ON parking_spots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = parking_spots.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.status = 'active'
  ));

CREATE POLICY parking_spots_insert ON parking_spots FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = parking_spots.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.role IN ('admin', 'moderator')
    AND community_members.status = 'active'
  ));

CREATE POLICY parking_spots_update ON parking_spots FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = parking_spots.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.role IN ('admin', 'moderator')
    AND community_members.status = 'active'
  ));

CREATE POLICY parking_spots_delete ON parking_spots FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = parking_spots.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.role = 'admin'
    AND community_members.status = 'active'
  ));

-- Parking Bookings RLS
ALTER TABLE parking_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY parking_bookings_select ON parking_bookings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = parking_bookings.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.status = 'active'
  ));

CREATE POLICY parking_bookings_insert ON parking_bookings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = parking_bookings.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.status = 'active'
  ));

CREATE POLICY parking_bookings_update ON parking_bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = parking_bookings.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.status = 'active'
      AND (
        community_members.id = parking_bookings.member_id
        OR community_members.role IN ('admin', 'moderator')
      )
    )
  );

CREATE POLICY parking_bookings_delete ON parking_bookings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = parking_bookings.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.status = 'active'
      AND (
        community_members.id = parking_bookings.member_id
        OR community_members.role IN ('admin', 'moderator')
      )
    )
  );

-- Visitors RLS
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY visitors_select ON visitors FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = visitors.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.status = 'active'
  ));

CREATE POLICY visitors_insert ON visitors FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM community_members
    WHERE community_members.community_id = visitors.community_id
    AND community_members.user_id = auth.uid()
    AND community_members.status = 'active'
  ));

CREATE POLICY visitors_update ON visitors FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = visitors.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.status = 'active'
      AND (
        community_members.id = visitors.host_member_id
        OR community_members.role IN ('admin', 'moderator')
      )
    )
  );

CREATE POLICY visitors_delete ON visitors FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = visitors.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.status = 'active'
      AND (
        community_members.id = visitors.host_member_id
        OR community_members.role IN ('admin', 'moderator')
      )
    )
  );

-- Work Locations RLS
ALTER TABLE work_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_locations_select ON work_locations FOR SELECT
  USING (
    -- Can see visible locations of community members
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = work_locations.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.status = 'active'
    )
    AND (
      work_locations.is_visible = true
      OR EXISTS (
        SELECT 1 FROM community_members
        WHERE community_members.id = work_locations.member_id
        AND community_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY work_locations_insert ON work_locations FOR INSERT
  WITH CHECK (
    -- Can only insert own locations
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.id = work_locations.member_id
      AND community_members.user_id = auth.uid()
      AND community_members.status = 'active'
    )
  );

CREATE POLICY work_locations_update ON work_locations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.id = work_locations.member_id
      AND community_members.user_id = auth.uid()
      AND community_members.status = 'active'
    )
  );

CREATE POLICY work_locations_delete ON work_locations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.id = work_locations.member_id
      AND community_members.user_id = auth.uid()
      AND community_members.status = 'active'
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check for desk booking conflicts
CREATE OR REPLACE FUNCTION check_desk_booking_conflict(
  p_desk_id UUID,
  p_booking_date DATE,
  p_start_time TIME DEFAULT NULL,
  p_end_time TIME DEFAULT NULL,
  p_exclude_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  conflict_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM desk_bookings
    WHERE desk_id = p_desk_id
    AND booking_date = p_booking_date
    AND status NOT IN ('cancelled', 'no_show')
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
    AND (
      -- Full day booking conflict
      (is_full_day = true)
      OR (p_start_time IS NULL) -- New booking is full day
      OR (
        -- Time overlap check
        start_time < COALESCE(p_end_time, '23:59:59')
        AND end_time > COALESCE(p_start_time, '00:00:00')
      )
    )
  ) INTO conflict_exists;

  RETURN conflict_exists;
END;
$$ LANGUAGE plpgsql;

-- Function to check for room booking conflicts
CREATE OR REPLACE FUNCTION check_room_booking_conflict(
  p_room_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_exclude_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  conflict_exists BOOLEAN;
  buffer_minutes INTEGER;
BEGIN
  -- Get buffer time for the room
  SELECT COALESCE(meeting_rooms.buffer_minutes, 0)
  INTO buffer_minutes
  FROM meeting_rooms
  WHERE id = p_room_id;

  SELECT EXISTS (
    SELECT 1 FROM room_bookings
    WHERE room_id = p_room_id
    AND status NOT IN ('cancelled')
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
    AND (
      -- Time overlap check with buffer
      start_time < (p_end_time + (buffer_minutes || ' minutes')::interval)
      AND end_time > (p_start_time - (buffer_minutes || ' minutes')::interval)
    )
  ) INTO conflict_exists;

  RETURN conflict_exists;
END;
$$ LANGUAGE plpgsql;

-- Function to get desk availability for a date range
CREATE OR REPLACE FUNCTION get_desk_availability(
  p_community_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  desk_id UUID,
  desk_name TEXT,
  booking_date DATE,
  is_available BOOLEAN,
  booked_by UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date AS date
  ),
  desk_dates AS (
    SELECT d.id, d.name, dr.date
    FROM desks d
    CROSS JOIN date_range dr
    WHERE d.community_id = p_community_id
    AND d.is_bookable = true
    AND d.status != 'maintenance'
  )
  SELECT
    dd.id AS desk_id,
    dd.name AS desk_name,
    dd.date AS booking_date,
    NOT EXISTS (
      SELECT 1 FROM desk_bookings db
      WHERE db.desk_id = dd.id
      AND db.booking_date = dd.date
      AND db.status NOT IN ('cancelled', 'no_show')
    ) AS is_available,
    (
      SELECT db.member_id FROM desk_bookings db
      WHERE db.desk_id = dd.id
      AND db.booking_date = dd.date
      AND db.status NOT IN ('cancelled', 'no_show')
      LIMIT 1
    ) AS booked_by
  FROM desk_dates dd
  ORDER BY dd.name, dd.date;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp triggers
CREATE TRIGGER update_floor_plans_updated_at
  BEFORE UPDATE ON floor_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_desks_updated_at
  BEFORE UPDATE ON desks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_desk_bookings_updated_at
  BEFORE UPDATE ON desk_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_rooms_updated_at
  BEFORE UPDATE ON meeting_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_bookings_updated_at
  BEFORE UPDATE ON room_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parking_spots_updated_at
  BEFORE UPDATE ON parking_spots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visitors_updated_at
  BEFORE UPDATE ON visitors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_locations_updated_at
  BEFORE UPDATE ON work_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
