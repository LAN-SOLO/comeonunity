-- Atomic increment for invite uses to prevent race conditions
CREATE OR REPLACE FUNCTION increment_invite_uses(invite_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE invites SET uses = uses + 1 WHERE id = invite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
