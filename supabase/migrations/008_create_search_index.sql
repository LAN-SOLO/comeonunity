-- =====================================================
-- ComeOnUnity v2.0 - Full-Text Search Index Migration
-- =====================================================

-- Search Index Table
-- Unified search index for all searchable content
CREATE TABLE IF NOT EXISTS search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities ON DELETE CASCADE NOT NULL,

  -- Content reference
  content_type TEXT NOT NULL CHECK (content_type IN ('news', 'item', 'event', 'member', 'resource')),
  content_id UUID NOT NULL,

  -- Searchable fields
  title TEXT NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}',

  -- Full-text search vector
  search_vector TSVECTOR,

  -- For filtering
  status TEXT DEFAULT 'active',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(content_type, content_id)
);

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_search_index_vector ON search_index USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_search_index_community ON search_index(community_id);
CREATE INDEX IF NOT EXISTS idx_search_index_type ON search_index(content_type);
CREATE INDEX IF NOT EXISTS idx_search_index_status ON search_index(status);

-- Function to generate search vector from title and content
CREATE OR REPLACE FUNCTION generate_search_vector(p_title TEXT, p_content TEXT)
RETURNS TSVECTOR AS $$
BEGIN
  RETURN (
    setweight(to_tsvector('german', COALESCE(p_title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(p_title, '')), 'A') ||
    setweight(to_tsvector('german', COALESCE(p_content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(p_content, '')), 'B')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function to update search vector
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := generate_search_vector(NEW.title, NEW.content);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
CREATE TRIGGER search_index_vector_update
  BEFORE INSERT OR UPDATE OF title, content ON search_index
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- =====================================================
-- Index News Articles
-- =====================================================
CREATE OR REPLACE FUNCTION index_news()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM search_index WHERE content_type = 'news' AND content_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Only index published news
  IF NEW.status = 'published' THEN
    INSERT INTO search_index (community_id, content_type, content_id, title, content, metadata, status)
    VALUES (
      NEW.community_id,
      'news',
      NEW.id,
      NEW.title,
      COALESCE(NEW.excerpt, '') || ' ' || COALESCE(NEW.content, ''),
      jsonb_build_object(
        'category', NEW.category,
        'author_id', NEW.author_id,
        'published_at', NEW.published_at,
        'image_url', NEW.image_url
      ),
      'active'
    )
    ON CONFLICT (content_type, content_id)
    DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      metadata = EXCLUDED.metadata,
      status = 'active';
  ELSE
    -- Remove from index if not published
    DELETE FROM search_index WHERE content_type = 'news' AND content_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER news_search_index
  AFTER INSERT OR UPDATE OR DELETE ON news
  FOR EACH ROW EXECUTE FUNCTION index_news();

-- =====================================================
-- Index Items
-- =====================================================
CREATE OR REPLACE FUNCTION index_items()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM search_index WHERE content_type = 'item' AND content_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Index all items except unavailable
  IF NEW.status != 'unavailable' THEN
    INSERT INTO search_index (community_id, content_type, content_id, title, content, metadata, status)
    VALUES (
      NEW.community_id,
      'item',
      NEW.id,
      COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.name_en, ''),
      COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.notes, ''),
      jsonb_build_object(
        'category', NEW.category,
        'owner_id', NEW.owner_id,
        'status', NEW.status,
        'condition', NEW.condition
      ),
      NEW.status
    )
    ON CONFLICT (content_type, content_id)
    DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      metadata = EXCLUDED.metadata,
      status = EXCLUDED.status;
  ELSE
    DELETE FROM search_index WHERE content_type = 'item' AND content_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER items_search_index
  AFTER INSERT OR UPDATE OR DELETE ON items
  FOR EACH ROW EXECUTE FUNCTION index_items();

-- =====================================================
-- Index Events
-- =====================================================
CREATE OR REPLACE FUNCTION index_events()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM search_index WHERE content_type = 'event' AND content_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Index scheduled events (not drafts or cancelled)
  IF NEW.status IN ('scheduled', 'completed') THEN
    INSERT INTO search_index (community_id, content_type, content_id, title, content, metadata, status)
    VALUES (
      NEW.community_id,
      'event',
      NEW.id,
      NEW.title,
      COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.location, ''),
      jsonb_build_object(
        'type', NEW.type,
        'starts_at', NEW.starts_at,
        'ends_at', NEW.ends_at,
        'location', NEW.location,
        'organizer_id', NEW.organizer_id
      ),
      NEW.status
    )
    ON CONFLICT (content_type, content_id)
    DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      metadata = EXCLUDED.metadata,
      status = EXCLUDED.status;
  ELSE
    DELETE FROM search_index WHERE content_type = 'event' AND content_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER events_search_index
  AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION index_events();

-- =====================================================
-- Index Community Members
-- =====================================================
CREATE OR REPLACE FUNCTION index_members()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM search_index WHERE content_type = 'member' AND content_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Index active members
  IF NEW.status = 'active' THEN
    INSERT INTO search_index (community_id, content_type, content_id, title, content, metadata, status)
    VALUES (
      NEW.community_id,
      'member',
      NEW.id,
      COALESCE(NEW.display_name, ''),
      COALESCE(NEW.bio, '') || ' ' || COALESCE(NEW.skills_description, '') || ' ' || COALESCE(array_to_string(NEW.skills, ' '), ''),
      jsonb_build_object(
        'role', NEW.role,
        'avatar_url', NEW.avatar_url,
        'unit_number', NEW.unit_number
      ),
      'active'
    )
    ON CONFLICT (content_type, content_id)
    DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      metadata = EXCLUDED.metadata,
      status = 'active';
  ELSE
    DELETE FROM search_index WHERE content_type = 'member' AND content_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER members_search_index
  AFTER INSERT OR UPDATE OR DELETE ON community_members
  FOR EACH ROW EXECUTE FUNCTION index_members();

-- =====================================================
-- Index Resources
-- =====================================================
CREATE OR REPLACE FUNCTION index_resources()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM search_index WHERE content_type = 'resource' AND content_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Index active resources
  IF NEW.status = 'active' THEN
    INSERT INTO search_index (community_id, content_type, content_id, title, content, metadata, status)
    VALUES (
      NEW.community_id,
      'resource',
      NEW.id,
      COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.name_en, ''),
      COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.rules, ''),
      jsonb_build_object(
        'type', NEW.type,
        'capacity', NEW.capacity,
        'booking_type', NEW.booking_type
      ),
      'active'
    )
    ON CONFLICT (content_type, content_id)
    DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      metadata = EXCLUDED.metadata,
      status = 'active';
  ELSE
    DELETE FROM search_index WHERE content_type = 'resource' AND content_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER resources_search_index
  AFTER INSERT OR UPDATE OR DELETE ON resources
  FOR EACH ROW EXECUTE FUNCTION index_resources();

-- =====================================================
-- Full-Text Search Function
-- =====================================================
CREATE OR REPLACE FUNCTION search_content(
  p_query TEXT,
  p_community_ids UUID[],
  p_content_types TEXT[] DEFAULT ARRAY['news', 'item', 'event', 'member', 'resource'],
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  content_type TEXT,
  content_id UUID,
  community_id UUID,
  title TEXT,
  content TEXT,
  metadata JSONB,
  rank REAL
) AS $$
DECLARE
  search_query TSQUERY;
BEGIN
  -- Convert query to tsquery with prefix matching for partial words
  search_query := (
    SELECT to_tsquery('german', string_agg(lexeme || ':*', ' & '))
    FROM unnest(string_to_array(trim(p_query), ' ')) lexeme
    WHERE length(lexeme) > 0
  );

  -- If German parsing fails, try English
  IF search_query IS NULL THEN
    search_query := (
      SELECT to_tsquery('english', string_agg(lexeme || ':*', ' & '))
      FROM unnest(string_to_array(trim(p_query), ' ')) lexeme
      WHERE length(lexeme) > 0
    );
  END IF;

  -- Fallback to simple query
  IF search_query IS NULL THEN
    search_query := plainto_tsquery('simple', p_query);
  END IF;

  RETURN QUERY
  SELECT
    si.content_type,
    si.content_id,
    si.community_id,
    si.title,
    si.content,
    si.metadata,
    ts_rank(si.search_vector, search_query) AS rank
  FROM search_index si
  WHERE
    si.community_id = ANY(p_community_ids)
    AND si.content_type = ANY(p_content_types)
    AND si.status NOT IN ('unavailable', 'draft', 'cancelled')
    AND (
      si.search_vector @@ search_query
      OR si.title ILIKE '%' || p_query || '%'
      OR si.content ILIKE '%' || p_query || '%'
    )
  ORDER BY rank DESC, si.updated_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Backfill existing data
-- =====================================================
CREATE OR REPLACE FUNCTION backfill_search_index()
RETURNS void AS $$
BEGIN
  -- Clear existing index
  DELETE FROM search_index;

  -- Index all published news
  INSERT INTO search_index (community_id, content_type, content_id, title, content, metadata, status)
  SELECT
    community_id,
    'news',
    id,
    title,
    COALESCE(excerpt, '') || ' ' || COALESCE(content, ''),
    jsonb_build_object(
      'category', category,
      'author_id', author_id,
      'published_at', published_at,
      'image_url', image_url
    ),
    'active'
  FROM news
  WHERE status = 'published';

  -- Index all available items
  INSERT INTO search_index (community_id, content_type, content_id, title, content, metadata, status)
  SELECT
    community_id,
    'item',
    id,
    COALESCE(name, '') || ' ' || COALESCE(name_en, ''),
    COALESCE(description, '') || ' ' || COALESCE(notes, ''),
    jsonb_build_object(
      'category', category,
      'owner_id', owner_id,
      'status', status,
      'condition', condition
    ),
    status
  FROM items
  WHERE status != 'unavailable';

  -- Index scheduled events
  INSERT INTO search_index (community_id, content_type, content_id, title, content, metadata, status)
  SELECT
    community_id,
    'event',
    id,
    title,
    COALESCE(description, '') || ' ' || COALESCE(location, ''),
    jsonb_build_object(
      'type', type,
      'starts_at', starts_at,
      'ends_at', ends_at,
      'location', location,
      'organizer_id', organizer_id
    ),
    status
  FROM events
  WHERE status IN ('scheduled', 'completed');

  -- Index active members
  INSERT INTO search_index (community_id, content_type, content_id, title, content, metadata, status)
  SELECT
    community_id,
    'member',
    id,
    COALESCE(display_name, ''),
    COALESCE(bio, '') || ' ' || COALESCE(skills_description, '') || ' ' || COALESCE(array_to_string(skills, ' '), ''),
    jsonb_build_object(
      'role', role,
      'avatar_url', avatar_url,
      'unit_number', unit_number
    ),
    'active'
  FROM community_members
  WHERE status = 'active' AND display_name IS NOT NULL;

  -- Index active resources
  INSERT INTO search_index (community_id, content_type, content_id, title, content, metadata, status)
  SELECT
    community_id,
    'resource',
    id,
    COALESCE(name, '') || ' ' || COALESCE(name_en, ''),
    COALESCE(description, '') || ' ' || COALESCE(rules, ''),
    jsonb_build_object(
      'type', type,
      'capacity', capacity,
      'booking_type', booking_type
    ),
    'active'
  FROM resources
  WHERE status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run backfill
SELECT backfill_search_index();

-- =====================================================
-- RLS Policies for search_index
-- =====================================================
ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;

-- Members can only search in their communities
CREATE POLICY "Members can search their communities"
  ON search_index FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
