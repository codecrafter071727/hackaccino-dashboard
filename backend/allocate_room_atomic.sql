-- Unified Atomic Allocation Function
-- This function handles everything in a single database transaction
-- preventing any race conditions even with high concurrency.

CREATE OR REPLACE FUNCTION allocate_room_atomic(p_team_id TEXT, p_room_name TEXT)
RETURNS JSONB AS $$
DECLARE
    v_room_updated_data RECORD;
    v_team_updated_data RECORD;
    v_result JSONB;
BEGIN
    -- 1. Try to decrement capacity only if > 0
    UPDATE rooms
    SET capacity = capacity - 1
    WHERE room_name = p_room_name
      AND capacity > 0
    RETURNING * INTO v_room_updated_data;

    -- 2. If no room was updated, it means it's full
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Room is full!',
            'message', 'The room "' || p_room_name || '" has reached its maximum capacity.'
        );
    END IF;

    -- 3. Assign the room to the team
    UPDATE teams
    SET allocated_room = p_room_name,
        updated_at = NOW()
    WHERE team_id = p_team_id
    RETURNING * INTO v_team_updated_data;

    -- 4. If team was not found (should not happen normally)
    IF NOT FOUND THEN
        -- Rollback room capacity
        UPDATE rooms
        SET capacity = capacity + 1
        WHERE room_name = p_room_name;
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Team not found',
            'message', 'The team ID "' || p_team_id || '" does not exist.'
        );
    END IF;

    -- 5. Return success with data
    RETURN jsonb_build_object(
        'success', true,
        'team', row_to_json(v_team_updated_data),
        'room', row_to_json(v_room_updated_data)
    );
END;
$$ LANGUAGE plpgsql;
