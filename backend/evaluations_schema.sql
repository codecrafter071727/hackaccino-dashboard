
-- Table to store evaluations from judges
CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id BIGINT REFERENCES teams(team_id),
    judge_email TEXT NOT NULL,
    round INTEGER NOT NULL, -- 1 or 2
    real_world_impact INTEGER CHECK (real_world_impact >= 0 AND real_world_impact <= 10),
    team_contribution INTEGER CHECK (team_contribution >= 0 AND team_contribution <= 10),
    uniqueness INTEGER CHECK (uniqueness >= 0 AND uniqueness <= 10),
    technical_execution INTEGER CHECK (technical_execution >= 0 AND technical_execution <= 10),
    presentation INTEGER CHECK (presentation >= 0 AND presentation <= 10),
    track TEXT,
    feedback TEXT,
    total_score INTEGER GENERATED ALWAYS AS (real_world_impact + team_contribution + uniqueness + technical_execution + presentation) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, judge_email, round) -- Prevents same judge from evaluating same team twice in same round
);

-- Index for faster lookup
CREATE INDEX idx_evaluations_team_id ON evaluations(team_id);
