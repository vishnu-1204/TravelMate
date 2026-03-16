const fs = require('fs');

const SUPABASE_URL = 'https://edjdtpkegqfnxbdfkyga.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkamR0cGtlZ3FmbnhiZGZreWdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgxODQ0MiwiZXhwIjoyMDg4Mzk0NDQyfQ.1A4HFnlkoKvaU_N8of0jjOeGdX43AVxGBjLtomtR-X0';

async function listSupabaseTables() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_KEY}`);
        if (!response.ok) {
            fs.writeFileSync('supabase_data.txt', `Error fetching schema: ${response.statusText}`);
            return;
        }
        const spec = await response.json();
        const tables = Object.keys(spec.definitions || {});
        
        let output = "--- Supabase Schema Overview ---\n\n";
        output += `Found ${tables.length} tables: ${tables.join(', ')}\n\n`;
        
        for (const table of tables) {
            output += `## Data for ${table}:\n`;
            const dataRes = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=5`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });
            if (dataRes.ok) {
                const data = await dataRes.json();
                output += JSON.stringify(data, null, 2) + "\n\n";
            } else {
                output += `Error fetching data for ${table}: ${dataRes.statusText}\n\n`;
            }
        }
        
        fs.writeFileSync('supabase_data.txt', output);
    } catch (err) {
        fs.writeFileSync('supabase_data.txt', `Exception: ${err.message}`);
    }
}

listSupabaseTables();
