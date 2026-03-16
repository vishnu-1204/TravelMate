const fs = require('fs');

const SUPABASE_URL = 'https://edjdtpkegqfnxbdfkyga.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkamR0cGtlZ3FmbnhiZGZreWdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgxODQ0MiwiZXhwIjoyMDg4Mzk0NDQyfQ.1A4HFnlkoKvaU_N8of0jjOeGdX43AVxGBjLtomtR-X0';

async function getSupabaseDefinitions() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_KEY}`);
        if (!response.ok) {
            fs.writeFileSync('supabase_schema.txt', `Error: ${response.statusText}`);
            return;
        }
        const spec = await response.json();
        const definitions = spec.definitions || {};
        
        let output = "--- Supabase Definitions ---\n\n";
        for (const [table, def] of Object.entries(definitions)) {
            output += `## ${table}\n`;
            output += JSON.stringify(def.properties || {}, null, 2) + "\n\n";
        }
        
        fs.writeFileSync('supabase_schema.txt', output);
    } catch (err) {
        fs.writeFileSync('supabase_schema.txt', `Exception: ${err.message}`);
    }
}

getSupabaseDefinitions();
