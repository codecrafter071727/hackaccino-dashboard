
-- Drop existing evaluations table if it exists
DROP TABLE IF EXISTS evaluations;

-- Create restructured evaluations table
CREATE TABLE evaluations (
    team_id BIGINT PRIMARY KEY REFERENCES teams(team_id),
    
    -- Round 1 Data
    round1_scores JSONB DEFAULT '{}'::jsonb, -- Stores the 5 criteria scores
    round1_judge TEXT,
    round1_total INTEGER DEFAULT 0,
    
    -- Round 2 Data
    round2_scores JSONB DEFAULT '{}'::jsonb, -- Stores the 5 criteria scores
    round2_judge TEXT,
    round2_total INTEGER DEFAULT 0,
    
    -- Overall Data
    final_total INTEGER DEFAULT 0,
    feedback TEXT,
    track TEXT,
    round1_feedback TEXT,
    round2_feedback TEXT,
    round1_judge_name TEXT,
    round2_judge_name TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_evaluations_final_total ON evaluations(final_total DESC);

-- Trigger to ensure JSONB round scores are populated automatically
CREATE OR REPLACE FUNCTION evaluations_apply_scores()
RETURNS trigger AS $$
DECLARE
  s jsonb;
  val_rwi int;
  val_tc int;
  val_uq int;
  val_te int;
  val_pr int;
BEGIN
  -- If round2_scores provided/modified, compute round 2 totals from JSON
  IF NEW.round2_scores IS NOT NULL THEN
    s := NEW.round2_scores;
    val_rwi := COALESCE((s->>'real_world_impact')::int, 0);
    val_tc  := COALESCE((s->>'team_contribution')::int, 0);
    val_uq  := COALESCE((s->>'uniqueness')::int, 0);
    val_te  := COALESCE((s->>'technical_execution')::int, 0);
    val_pr  := COALESCE((s->>'presentation')::int, 0);
    NEW.round2_total := val_rwi + val_tc + val_uq + val_te + val_pr;
    NEW.round2_total := COALESCE(NEW.round2_total, 0);
  END IF;

  -- If round1_scores provided/modified, compute round 1 totals from JSON
  IF NEW.round1_scores IS NOT NULL THEN
    s := NEW.round1_scores;
    val_rwi := COALESCE((s->>'real_world_impact')::int, 0);
    val_tc  := COALESCE((s->>'team_contribution')::int, 0);
    val_uq  := COALESCE((s->>'uniqueness')::int, 0);
    val_te  := COALESCE((s->>'technical_execution')::int, 0);
    val_pr  := COALESCE((s->>'presentation')::int, 0);
    NEW.round1_total := val_rwi + val_tc + val_uq + val_te + val_pr;
    NEW.round1_total := COALESCE(NEW.round1_total, 0);
  END IF;

  -- Compute final total
  NEW.final_total := COALESCE(NEW.round1_total, 0) + COALESCE(NEW.round2_total, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_evaluations_apply_scores ON evaluations;
CREATE TRIGGER trg_evaluations_apply_scores
BEFORE INSERT OR UPDATE ON evaluations
FOR EACH ROW EXECUTE FUNCTION evaluations_apply_scores();
