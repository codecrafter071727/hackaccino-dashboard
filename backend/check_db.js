
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const supabase = require('./src/config/supabaseClient');

async function checkSchema() {
  console.log('Checking database schema compatibility...');
  
  const tablesToCheck = [
    { name: 'teams', columns: 'team_id, team_leader_name, team_members' },
    { name: 'staff_assignments', columns: 'email, duty' },
    { name: 'allowed_judges', columns: 'email, name' },
    { name: 'rooms', columns: 'room_name, capacity' },
    { name: 'volunteer_assignments', columns: 'name, room_no' },
    { name: 'evaluations', columns: 'team_id, round1_total, round2_total, final_total, round1_scores, round2_scores' }
  ];

  for (const table of tablesToCheck) {
    const { data, error } = await supabase
      .from(table.name)
      .select(table.columns)
      .limit(1);

    if (error) {
      console.error(`❌ Table "${table.name}" check FAILED.`);
      console.error('Error details:', error.message);
      if (error.message.includes('Could not find the table')) {
        console.error(`CAUSE: The table "${table.name}" does not exist in the database.`);
        console.error(`SOLUTION: Run the corresponding SQL script for "${table.name}" in your Supabase SQL Editor.`);
      }
    } else {
      console.log(`✅ Table "${table.name}" check PASSED.`);
    }
  }
}

checkSchema();
