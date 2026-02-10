require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY are required in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Path to JSON file
const jsonFilePath = path.join(__dirname, 'student-detail.json');

async function importData() {
  try {
    // Read JSON file
    console.log('Reading student-detail.json...');
    const rawData = fs.readFileSync(jsonFilePath, 'utf8');
    const teamsRaw = JSON.parse(rawData);

    console.log(`Found ${teamsRaw.length} teams to import.`);

    // Transform data to match new schema
    const teams = teamsRaw.map(team => ({
      team_id: team.team_id,
      team_leader_name: team.team_leader_name,
      registered_email: team.registered_email,
      registered_phone: team.registered_phone,
      // Initialize leader status
      leader_present: false,
      leader_id_issued: false,
      // Transform team_members string array to object array
      team_members: team.team_members.map(member => ({
        name: member,
        is_present: false,
        id_card_issued: false
      }))
    }));

    // Import data in batches to avoid hitting limits
    const BATCH_SIZE = 100;
    for (let i = 0; i < teams.length; i += BATCH_SIZE) {
      const batch = teams.slice(i, i + BATCH_SIZE);
      
      console.log(`Importing batch ${i / BATCH_SIZE + 1} (${batch.length} records)...`);

      const { data, error } = await supabase
        .from('teams')
        .upsert(batch, { onConflict: 'team_id' });

      if (error) {
        console.error('Error inserting batch:', error);
      } else {
        console.log(`Batch ${i / BATCH_SIZE + 1} imported successfully.`);
      }
    }

    console.log('Data import completed!');
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

importData();
