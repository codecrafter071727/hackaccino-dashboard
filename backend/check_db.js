
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const supabase = require('./src/config/supabaseClient');

async function checkSchema() {
  console.log('Checking database schema compatibility...');
  
  // Try to select the new columns
  const { data, error } = await supabase
    .from('teams')
    .select('leader_present, leader_id_issued, team_members')
    .limit(1);

  if (error) {
    console.error('❌ Database schema check FAILED.');
    console.error('Error details:', error.message);
    console.error('\nCAUSE: The database table "teams" is missing the required columns.');
    console.error('SOLUTION: You must run the SQL script in "backend/schema.sql" in your Supabase SQL Editor.');
  } else {
    console.log('✅ Database schema check PASSED.');
    console.log('The "teams" table has the correct structure.');
    
    // Check data type of team_members
    if (data.length > 0) {
      const members = data[0].team_members;
      if (typeof members === 'string' || (Array.isArray(members) && typeof members[0] === 'string')) {
        console.warn('⚠️ WARNING: "team_members" seems to contain strings, not objects.');
        console.warn('You may need to re-import your data using "node importData.js" after updating the schema.');
      } else {
        console.log('✅ "team_members" column appears to store JSON objects correctly.');
      }
    }
  }
}

checkSchema();
