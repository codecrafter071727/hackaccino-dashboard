-- SQL to refresh the teams table schema with new JSON fields
-- Run this in your Supabase SQL Editor

-- 1. Backup current status columns if you want to keep them (optional)
-- But user said to delete previous data, so we can just recreate the table.

DROP TABLE IF EXISTS teams;

CREATE TABLE teams (
    team_id TEXT PRIMARY KEY, -- Team ID from JSON
    team_name TEXT,
    team_leader_name TEXT,
    registered_email TEXT,
    registered_phone TEXT DEFAULT 'N/A',
    
    -- Status columns to keep
    leader_present BOOLEAN DEFAULT FALSE,
    leader_id_issued BOOLEAN DEFAULT FALSE,
    team_members JSONB DEFAULT '[]'::jsonb, -- Stores array: [{ "name": "Name", "email": "Mail", "is_present": false, "id_card_issued": false }]
    allocated_room TEXT,
    
    -- New fields from students-detail.json
    total_members_count INTEGER DEFAULT 0,
    invite_status TEXT,
    team_status TEXT,
    mentors_assigned TEXT,
    current_phase TEXT,
    created_at_json TEXT,
    
    -- Timestamp for DB tracking
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (optional, keep as per your Supabase config)
-- ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
