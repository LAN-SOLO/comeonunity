-- =====================================================
-- ComeOnUnity v2.0 - Seed Data for Development
-- =====================================================

-- Note: This seed file is for development/testing only.
-- Do NOT run this in production.

-- =====================================================
-- SKILL CATEGORIES (for reference)
-- =====================================================

-- Common skill categories used in the app:
-- - Handwork: 'plumbing', 'electrical', 'carpentry', 'painting', 'gardening'
-- - Tech: 'computer_help', 'smartphone_help', 'printer_setup', 'wifi_setup'
-- - Languages: 'german_help', 'english_help', 'translation'
-- - Care: 'pet_sitting', 'plant_care', 'elderly_assistance', 'childcare'
-- - Transport: 'driving', 'moving_help', 'errands'
-- - Other: 'cooking', 'tutoring', 'music_lessons', 'fitness', 'photography'

-- =====================================================
-- ITEM CATEGORIES (for reference)
-- =====================================================

-- Common item categories:
-- - Tools: 'drill', 'saw', 'ladder', 'toolbox', 'measuring'
-- - Garden: 'lawnmower', 'hedge_trimmer', 'wheelbarrow', 'hose'
-- - Kitchen: 'mixer', 'blender', 'fondue', 'raclette', 'party_dishes'
-- - Sports: 'bicycle', 'ski', 'camping', 'fitness'
-- - Electronics: 'projector', 'speaker', 'camera', 'console'
-- - Other: 'furniture', 'car', 'trailer', 'party_tent'

-- =====================================================
-- SAMPLE DATA INSERTION
-- =====================================================

-- Note: In a real scenario, you would create users through Supabase Auth first,
-- then the user_profiles would be created automatically via the trigger.

-- For development, you can manually insert test communities after setting up auth:

/*
-- Example: Create a test community (run after you have a user in auth.users)

INSERT INTO communities (
  name,
  slug,
  description,
  type,
  address,
  city,
  postal_code,
  country,
  locale,
  plan,
  status,
  created_by
) VALUES (
  'Musterhaus Community',
  'musterhaus',
  'Eine freundliche Hausgemeinschaft in Berlin',
  'house',
  'Musterstraße 123',
  'Berlin',
  '10115',
  'DE',
  'de',
  'free',
  'active',
  '00000000-0000-0000-0000-000000000000' -- Replace with actual user ID
);

-- Example: Add the creator as admin
INSERT INTO community_members (
  community_id,
  user_id,
  role,
  display_name,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- Replace with community ID
  '00000000-0000-0000-0000-000000000000', -- Replace with user ID
  'admin',
  'Max Mustermann',
  'active'
);

-- Example: Create a bookable resource
INSERT INTO resources (
  community_id,
  name,
  name_en,
  description,
  type,
  booking_type,
  slot_duration_minutes,
  min_advance_hours,
  max_advance_days,
  available_from,
  available_until,
  capacity,
  rules,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- Replace with community ID
  'Gemeinschaftsraum',
  'Community Room',
  'Gemütlicher Raum für Versammlungen und Feiern',
  'room',
  'slot',
  60,
  24,
  30,
  '09:00',
  '22:00',
  20,
  'Bitte nach Nutzung aufräumen. Musikveranstaltungen bis 22 Uhr.',
  'active'
);

-- Example: Create a lendable item
INSERT INTO items (
  community_id,
  owner_id,
  name,
  name_en,
  description,
  category,
  status,
  condition,
  requires_approval,
  max_borrow_days,
  pickup_location
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- Replace with community ID
  '00000000-0000-0000-0000-000000000000', -- Replace with member ID
  'Bohrmaschine',
  'Power Drill',
  'Bosch Professional mit diversen Aufsätzen',
  'drill',
  'available',
  'good',
  true,
  7,
  'Keller, Spind 12'
);
*/

-- =====================================================
-- TEST DATA CLEANUP (run before seeding)
-- =====================================================

/*
-- WARNING: Only run this in development!
TRUNCATE TABLE
  bookings,
  borrow_requests,
  items,
  resources,
  news_comments,
  news,
  invites,
  notifications,
  moderation_reports,
  audit_logs,
  community_analytics,
  community_members,
  communities
CASCADE;
*/
