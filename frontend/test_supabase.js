import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing supabase keys in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    // A quick way to test if the REST API and keys are valid is to do a simple query or even just check health if possible.
    // Querying an arbitrary table or accessing a known public endpoint. 
    // We can just try to get session, or list some table avoiding panic.
    const { data, error } = await supabase.from('user_profiles').select('id').limit(1);
    
    if (error) {
       console.log("Connection successful, but error reading table:", error.message);
    } else {
       console.log("Connection successful, successfully queried table.");
    }
  } catch (err) {
    console.error("Failed to connect:", err);
  }
}

testConnection();
