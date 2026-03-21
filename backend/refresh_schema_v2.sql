-- Optimized schema: Unified member tracking
-- Run this in your Supabase SQL Editor

DROP TABLE IF EXISTS teams;

CREATE TABLE teams (
    team_id TEXT PRIMARY KEY,
    team_name TEXT,
    team_leader_name TEXT,
    registered_email TEXT,
    registered_phone TEXT DEFAULT 'N/A',
    
    -- UNIFIED STATUS TRACKING
    -- This array will contain EVERYONE (Leader + Members)
    -- Format: [{ "name": "...", "email": "...", "role": "Leader/Member", "is_present": false, "id_card_issued": false }]
    team_members JSONB DEFAULT '[]'::jsonb,
    
    allocated_room TEXT,
    total_members_count INTEGER DEFAULT 0,
    invite_status TEXT,
    team_status TEXT,
    mentors_assigned TEXT,
    current_phase TEXT,
    created_at_json TEXT,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
