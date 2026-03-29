-- Unified Atomic Allocation Function
-- This function handles everything in a single database transaction
-- preventing any race conditions even with high concurrency.

CREATE OR REPLACE FUNCTION allocate_room_atomic(p_team_id TEXT, p_room_name TEXT)
RETURNS JSONB AS $$
DECLARE
    v_old_room_name TEXT;
    v_room_updated_data RECORD;
    v_old_room_updated_data RECORD;
    v_team_updated_data RECORD;
BEGIN
    -- 1. Get the current room of the team
    SELECT allocated_room INTO v_old_room_name FROM teams WHERE team_id = p_team_id;

    -- 2. If already in the same room, return success
    IF v_old_room_name = p_room_name THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Team already assigned to this room.',
            'old_room_name', v_old_room_name
        );
    END IF;

    -- 3. Try to decrement capacity of the NEW room only if > 0
    UPDATE rooms
    SET capacity = capacity - 1
    WHERE room_name = p_room_name
      AND capacity > 0
    RETURNING * INTO v_room_updated_data;

    -- 4. If no room was updated, it means it's full
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Room is full!',
            'message', 'The room "' || p_room_name || '" has reached its maximum capacity.'
        );
    END IF;

    -- 5. If they had an old room, increment its capacity back
    IF v_old_room_name IS NOT NULL THEN
        UPDATE rooms
        SET capacity = capacity + 1
        WHERE room_name = v_old_room_name
        RETURNING * INTO v_old_room_updated_data;
    END IF;

    -- 6. Assign the new room to the team
    UPDATE teams
    SET allocated_room = p_room_name,
        updated_at = NOW()
    WHERE team_id = p_team_id
    RETURNING * INTO v_team_updated_data;

    -- 7. If team was not found (should not happen normally)
    IF NOT FOUND THEN
        -- Rollback room capacity
        UPDATE rooms
        SET capacity = capacity + 1
        WHERE room_name = p_room_name;
        
        IF v_old_room_name IS NOT NULL THEN
            UPDATE rooms
            SET capacity = capacity - 1
            WHERE room_name = v_old_room_name;
        END IF;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'Team not found',
            'message', 'The team ID "' || p_team_id || '" does not exist.'
        );
    END IF;

    -- 8. Return success with data
    RETURN jsonb_build_object(
        'success', true,
        'team', row_to_json(v_team_updated_data),
        'room', row_to_json(v_room_updated_data),
        'old_room', row_to_json(v_old_room_updated_data),
        'old_room_name', v_old_room_name
    );
END;
$$ LANGUAGE plpgsql;
