-- Add theme preference to user_profiles
-- Supports: 'light', 'dark', 'system'
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'system';

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.theme_preference IS 'User''s preferred theme: light, dark, or system';

-- Create index for faster lookups (optional, but useful if filtering by theme)
CREATE INDEX IF NOT EXISTS idx_user_profiles_theme_preference ON user_profiles(theme_preference);
