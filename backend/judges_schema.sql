-- Table to store allowed judges' email addresses
CREATE TABLE IF NOT EXISTS allowed_judges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by TEXT -- Optional: store which admin added this judge
);

-- Enable RLS
ALTER TABLE allowed_judges ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read (or restrict to admins if needed)
CREATE POLICY "Allow authenticated read access" ON allowed_judges
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role or specific admins to manage (for simplicity, we'll handle this in the app)
CREATE POLICY "Allow all access to service role" ON allowed_judges
    USING (auth.role() = 'service_role');
