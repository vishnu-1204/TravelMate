require('dotenv').config({ path: '../.env' }); // try to load env from root if possible, though keys are hardcoded in older scripts
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://edjdtpkegqfnxbdfkyga.supabase.co';
// Using the same key found in existing scripts
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkamR0cGtlZ3FmbnhiZGZreWdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgxODQ0MiwiZXhwIjoyMDg4Mzk0NDQyfQ.1A4HFnlkoKvaU_N8of0jjOeGdX43AVxGBjLtomtR-X0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function viewRecentSupabaseData() {
    let output = "--- Recent Supabase Data Overview ---\n\n";

    const tables = ['profiles', 'bookings'];

    for (const table of tables) {
        output += `## Recent records from Table: ${table}\n`;
        try {
            // Order by created_at descending to get the most recent data
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) {
                output += `Error: ${error.message}\n`;
            } else if (!data || data.length === 0) {
                output += `Status: Empty or no rows found.\n`;
            } else {
                output += JSON.stringify(data, null, 2) + "\n";
            }
        } catch (err) {
            output += `Exception: ${err.message}\n`;
        }
        output += "\n";
    }

    fs.writeFileSync('recent_supabase_data.txt', output);
    console.log("Recent data written to recent_supabase_data.txt");
}

viewRecentSupabaseData();
