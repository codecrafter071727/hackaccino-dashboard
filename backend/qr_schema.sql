-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/bvlqcsubsqbbbrkzekzf/sql/new

-- 1. Create the team_qr_codes table
CREATE TABLE IF NOT EXISTS team_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT REFERENCES teams(team_id) ON DELETE CASCADE,
  qr_image TEXT,                        -- base64 PNG data URL of the QR code
  qr_payload JSONB,                     -- full data embedded in the QR code
  attendance_uses_remaining INT DEFAULT 2,  -- starts at 2, decrements on each attendance scan
  refreshment_uses_remaining INT DEFAULT 2, -- starts at 2, decrements on each refreshment scan
  total_members INT,
  present_members JSONB,                -- JSON array of present member names
  present_count INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id)
);

-- 2. Add email_sent column to teams table (prevents duplicate emails)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;

-- Optional: Index for fast team_id lookups
CREATE INDEX IF NOT EXISTS idx_team_qr_codes_team_id ON team_qr_codes(team_id);

-- 3. Add individual scan-slot tracking columns to team_qr_codes
ALTER TABLE team_qr_codes
  ADD COLUMN IF NOT EXISTS attendance_1_scanned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS attendance_2_scanned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS refreshment_1_scanned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS refreshment_2_scanned BOOLEAN DEFAULT FALSE;
