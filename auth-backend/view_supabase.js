const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://edjdtpkegqfnxbdfkyga.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkamR0cGtlZ3FmbnhiZGZreWdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgxODQ0MiwiZXhwIjoyMDg4Mzk0NDQyfQ.1A4HFnlkoKvaU_N8of0jjOeGdX43AVxGBjLtomtR-X0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function viewSupabaseData() {
    let output = "--- Supabase Data Overview ---\n\n";

    const tables = ['profiles', 'bookings', 'reviews'];

    for (const table of tables) {
        output += `## Table: ${table}\n`;
        try {
            const { data, error } = await supabase.from(table).select('*').limit(10);
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

    fs.writeFileSync('supabase_data.txt', output);
    console.log("Supabase data written to supabase_data.txt");
}

viewSupabaseData();
