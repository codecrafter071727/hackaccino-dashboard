-- Optimization indexes for teams table
CREATE INDEX IF NOT EXISTS idx_teams_leader_name ON teams (team_leader_name);
CREATE INDEX IF NOT EXISTS idx_teams_registered_email ON teams (registered_email);
CREATE INDEX IF NOT EXISTS idx_teams_registered_phone ON teams (registered_phone);

-- GIN index for JSONB team_members to speed up searches inside the array
CREATE INDEX IF NOT EXISTS idx_teams_team_members ON teams USING GIN (team_members);
