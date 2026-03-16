const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const SUPABASE_URL = 'https://edjdtpkegqfnxbdfkyga.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkamR0cGtlZ3FmbnhiZGZreWdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgxODQ0MiwiZXhwIjoyMDg4Mzk0NDQyfQ.1A4HFnlkoKvaU_N8of0jjOeGdX43AVxGBjLtomtR-X0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const db = new sqlite3.Database('auth.db');

async function migrate() {
    console.log("Starting migration...");
    const userMap = new Map(); // localId -> uuid

    // 1. Migrate Users to Profiles
    console.log("Migrating users to profiles...");
    const users = await new Promise((resolve, reject) => {
        db.all("SELECT * FROM users", (err, rows) => err ? reject(err) : resolve(rows));
    });

    for (const user of users) {
        const profileId = uuidv4();
        userMap.set(user.id.toString(), profileId);

        const { error } = await supabase.from('profiles').insert({
            id: profileId,
            created_at: user.created_at || new Date().toISOString()
            // email is not in profiles table schema I saw earlier, but we can store it in metadata if we had a field
        });
        if (error) console.error(`Error inserting profile for user ${user.id}:`, error.message);
    }
    console.log(`Migrated ${users.length} users.`);

    // 2. Migrate Bookings
    console.log("Migrating bookings...");
    const bookings = await new Promise((resolve, reject) => {
        db.all("SELECT * FROM bookings", (err, rows) => err ? reject(err) : resolve(rows));
    });

    const bookingsToInsert = bookings.map(b => ({
        user_id: userMap.get(b.user_id?.toString()) || null, // Map to new UUID if possible
        booking_reference: b.booking_reference,
        package_id: b.package_id,
        package_title: b.package_title,
        travelers: b.travelers,
        first_name: b.first_name,
        last_name: b.last_name,
        email: b.email,
        phone: b.phone,
        total_amount: b.total_amount,
        payment_id: b.payment_id,
        payment_status: b.payment_status,
        payment_verified: b.payment_verified === 1,
        booking_status: b.booking_status,
        email_sent: b.email_sent === 1,
        created_at: b.created_at || new Date().toISOString()
    }));

    // Batch insert bookings (chunks of 50 to avoid limits)
    for (let i = 0; i < bookingsToInsert.length; i += 50) {
        const chunk = bookingsToInsert.slice(i, i + 50);
        const { error } = await supabase.from('bookings').insert(chunk);
        if (error) console.error(`Error inserting bookings chunk:`, error.message);
    }
    console.log(`Migrated ${bookings.length} bookings.`);

    db.close();
    console.log("Migration finished.");
}

migrate();
