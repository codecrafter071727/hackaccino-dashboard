-- Updated schema for individual member tracking
-- Run this in Supabase SQL Editor (it will drop the old table and create a new one)

DROP TABLE IF EXISTS teams;

CREATE TABLE teams (
    team_id BIGINT PRIMARY KEY,
    team_leader_name TEXT,
    team_members JSONB, -- Stores array of objects: [{ "name": "Name", "is_present": false, "id_card_issued": false }]
    registered_email TEXT,
    registered_phone TEXT,
    leader_present BOOLEAN DEFAULT FALSE,
    leader_id_issued BOOLEAN DEFAULT FALSE,
    allocated_room TEXT -- Stores the assigned room name
);
