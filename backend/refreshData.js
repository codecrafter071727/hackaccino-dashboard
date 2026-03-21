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
const jsonFilePath = path.join(__dirname, 'students-detail.json');

async function refreshData() {
  try {
    // 1. Read JSON file
    if (!fs.existsSync(jsonFilePath)) {
      console.error(`Error: ${jsonFilePath} not found`);
      process.exit(1);
    }

    console.log('Reading students-detail.json...');
    const rawData = fs.readFileSync(jsonFilePath, 'utf8');
    const teamsRaw = JSON.parse(rawData);

    console.log(`Found ${teamsRaw.length} teams to import.`);

    // 2. Delete existing data from teams table
    console.log('Clearing existing teams data from Supabase...');
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .neq('team_id', -1); // Delete all rows

    if (deleteError) {
      console.error('Error deleting existing data:', deleteError);
      process.exit(1);
    }
    console.log('Existing data cleared.');

    // 3. Transform and batch import
    const teams = teamsRaw.map(team => {
      // 3.1 Create unified team_members array starting with the Leader
      const members = [
        {
          name: team["Leader Name"],
          email: team["Leader Mail"],
          role: "Leader",
          is_present: false,
          id_card_issued: false
        }
      ];

      // 3.2 Add other members from the JSON strings
      const memberNames = team["Members Names"] ? team["Members Names"].split(',').map(n => n.trim()) : [];
      const memberMails = team["Members Mail"] ? team["Members Mail"].split(',').map(m => m.trim()) : [];
      
      memberNames.forEach((name, idx) => {
        if (name) { // Skip empty names
          members.push({
            name: name,
            email: memberMails[idx] || '',
            role: "Member",
            is_present: false,
            id_card_issued: false
          });
        }
      });

      return {
        team_id: team["Team ID"],
        team_name: team["Team Name"],
        team_leader_name: team["Leader Name"],
        registered_email: team["Leader Mail"],
        registered_phone: team["Leader Phone"] || 'N/A',
        team_members: members, // Unified array
        total_members_count: parseInt(team["Total Members Count"] || "0"),
        invite_status: team["Invite Status Summary"],
        team_status: team["Team Status"],
        mentors_assigned: team["Mentors Assigned"],
        current_phase: team["Current Phase"],
        created_at_json: team["Created At"]
      };
    });

    // Import in batches
    const BATCH_SIZE = 50;
    console.log(`Importing ${teams.length} records in batches of ${BATCH_SIZE}...`);
    
    for (let i = 0; i < teams.length; i += BATCH_SIZE) {
      const batch = teams.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}...`);
      
      const { error: insertError } = await supabase
        .from('teams')
        .insert(batch);

      if (insertError) {
        console.error(`Error inserting batch ${Math.floor(i/BATCH_SIZE) + 1}:`, insertError);
        // Continue with next batch or exit? Let's exit on error for data integrity
        process.exit(1);
      }
    }

    console.log('Data refresh completed successfully!');
  } catch (error) {
    console.error('Unexpected error during refresh:', error);
    process.exit(1);
  }
}

refreshData();
