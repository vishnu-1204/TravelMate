const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://edjdtpkegqfnxbdfkyga.supabase.co';
// Using the SERVICE_ROLE_KEY for admin actions
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkamR0cGtlZ3FmbnhiZGZreWdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgxODQ0MiwiZXhwIjoyMDg4Mzk0NDQyfQ.1A4HFnlkoKvaU_N8of0jjOeGdX43AVxGBjLtomtR-X0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const db = new sqlite3.Database('auth.db');

async function migrate() {
    console.log("Starting Migration v3 (with Auth)...");

    try {
        // 1. Create a dummy user in Supabase Auth
        console.log("Creating dummy user in Supabase Auth...");
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: 'legacy_data@travelmate.local',
            password: 'LegacyPassword123!',
            email_confirm: true
        });

        let dummyUserId;
        if (authError) {
            if (authError.message.includes('already registered')) {
                console.log("Dummy user already exists, fetching...");
                const { data: users } = await supabase.auth.admin.listUsers();
                const existingUser = users.users.find(u => u.email === 'legacy_data@travelmate.local');
                dummyUserId = existingUser.id;
            } else {
                throw authError;
            }
        } else {
            dummyUserId = authUser.user.id;
        }

        console.log(`Using User ID: ${dummyUserId}`);

        // 2. Fetch local bookings
        const bookings = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM bookings", (err, rows) => err ? reject(err) : resolve(rows));
        });
        console.log(`Found ${bookings.length} local bookings.`);

        const bookingsToInsert = bookings.map(b => ({
            user_id: dummyUserId, // COMPULSORY satisfy NOT NULL
            booking_reference: b.booking_reference,
            package_id: b.package_id || 'manual-entry',
            package_title: b.package_title,
            travelers: b.travelers || 1,
            first_name: b.first_name || 'Legacy',
            last_name: b.last_name || 'User',
            email: b.email,
            phone: b.phone || '',
            total_amount: b.total_amount || 0,
            payment_id: b.payment_id || 'imported',
            payment_status: b.payment_status || 'paid',
            payment_verified: true,
            booking_status: b.booking_status || 'confirmed',
            email_sent: false,
            created_at: b.created_at || new Date().toISOString()
        }));

        // Batch insert bookings
        for (let i = 0; i < bookingsToInsert.length; i += 50) {
            const chunk = bookingsToInsert.slice(i, i + 50);
            const { error: insertError } = await supabase.from('bookings').insert(chunk);
            if (insertError) console.error(`Error inserting chunk ${i}:`, insertError.message);
        }

        console.log("Migration successful.");

    } catch (err) {
        console.error("Migration failed:", err.message);
    } finally {
        db.close();
    }
}

migrate();
