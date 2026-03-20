-- SQL to create the atomic capacity update function
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION decrement_room_capacity(target_room_name TEXT)
RETURNS SETOF rooms AS $$
BEGIN
  RETURN QUERY
  UPDATE rooms
  SET capacity = capacity - 1
  WHERE room_name = target_room_name
    AND capacity > 0
  RETURNING *;
END;
$$ LANGUAGE plpgsql;
