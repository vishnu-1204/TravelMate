const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://edjdtpkegqfnxbdfkyga.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkamR0cGtlZ3FmbnhiZGZreWdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgxODQ0MiwiZXhwIjoyMDg4Mzk0NDQyfQ.1A4HFnlkoKvaU_N8of0jjOeGdX43AVxGBjLtomtR-X0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const db = new sqlite3.Database('auth.db');

async function migrate() {
    console.log("Starting Booking Migration v2...");

    const bookings = await new Promise((resolve, reject) => {
        db.all("SELECT * FROM bookings", (err, rows) => err ? reject(err) : resolve(rows));
    });

    console.log(`Found ${bookings.length} local bookings.`);

    const bookingsToInsert = bookings.map(b => ({
        // We skip user_id if it's not a valid UUID to avoid FK errors
        // or set it to null if possible.
        user_id: null, 
        booking_reference: b.booking_reference,
        package_id: b.package_id || 'manual-entry', // Fallback for not-null constraint
        package_title: b.package_title,
        travelers: b.travelers || 1,
        first_name: b.first_name || 'Legacy',
        last_name: b.last_name || 'Booking',
        email: b.email,
        phone: b.phone || '',
        total_amount: b.total_amount || 0,
        payment_id: b.payment_id || 'legacy',
        payment_status: b.payment_status || 'paid',
        payment_verified: b.payment_verified === 1 || true,
        booking_status: b.booking_status || 'confirmed',
        email_sent: b.email_sent === 1,
        created_at: b.created_at || new Date().toISOString()
    }));

    let successCount = 0;
    let errorCount = 0;

    // Batch insert bookings
    for (let i = 0; i < bookingsToInsert.length; i += 20) {
        const chunk = bookingsToInsert.slice(i, i + 20);
        const { error } = await supabase.from('bookings').insert(chunk);
        if (error) {
            console.error(`Error inserting chunk ${i}:`, error.message);
            errorCount += chunk.length;
        } else {
            successCount += chunk.length;
        }
    }

    console.log(`Migration results: ${successCount} succeeded, ${errorCount} failed.`);
    db.close();
}

migrate();
