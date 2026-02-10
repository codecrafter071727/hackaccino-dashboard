
import { createClient } from '@supabase/supabase-js';

// Credentials from your Supabase project
const supabaseUrl = 'https://bvlqcsubsqbbbrkzekzf.supabase.co';
const supabaseKey = 'sb_publishable_Ay9VnYDmmEGSGzbAc1SUPg_4QDwbtP6'; // Note: This is your public anon key, it's safe to be in frontend code

export const supabase = createClient(supabaseUrl, supabaseKey);
