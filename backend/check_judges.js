
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const supabase = require('./src/config/supabaseClient');

async function checkJudgesSchema() {
  console.log('Checking "allowed_judges" table schema...');
  
  const { data, error } = await supabase
    .from('allowed_judges')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error fetching from "allowed_judges":', error.message);
    if (error.message.includes('column "name" does not exist')) {
        console.error('CAUSE: The "name" column is missing in the database.');
    }
  } else {
    console.log('✅ Successfully fetched from "allowed_judges".');
    if (data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
        if ('name' in data[0]) {
            console.log('✅ "name" column exists.');
        } else {
            console.error('❌ "name" column NOT found in results.');
        }
    } else {
        console.log('Table is empty, checking column definitions via RPC or another select if possible...');
        // Try selecting specifically
        const { error: colError } = await supabase
            .from('allowed_judges')
            .select('name')
            .limit(1);
        
        if (colError) {
            console.error('❌ "name" column does NOT seem to exist:', colError.message);
        } else {
            console.log('✅ "name" column exists (verified by specific select).');
        }
    }
  }
}

checkJudgesSchema();
