import { createClient } from "@supabase/supabase-js";
import { getDb, initDatabase } from "../db";
import { config } from "../config/env";
import path from "path";

async function syncToSupabase() {
  console.log("🚀 Starting synchronization from SQLite to Supabase...");

  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    console.error("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env");
    process.exit(1);
  }

  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);

  try {
    await initDatabase();
    const db = getDb();

    console.log("Fetching bookings from SQLite...");
    const sqliteBookings: any[] = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM bookings", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`Found ${sqliteBookings.length} bookings in SQLite.`);

    for (const booking of sqliteBookings) {
      console.log(`Syncing booking ${booking.booking_reference}...`);

      const bookingTerms = booking.booking_terms ? JSON.parse(booking.booking_terms) : {};
      
      const payload = {
        booking_reference: booking.booking_reference,
        user_id: booking.user_id,
        package_id: booking.package_id,
        package_title: booking.package_title,
        first_name: booking.first_name || booking.traveler_name?.split(' ')[0] || "Traveler",
        last_name: booking.last_name || booking.traveler_name?.split(' ').slice(1).join(' ') || "-",
        email: booking.email,
        phone: booking.phone,
        total_amount: booking.total_amount,
        travelers: booking.travelers,
        payment_status: booking.payment_status,
        payment_verified: !!booking.payment_verified,
        booking_status: booking.booking_status,
        booking_terms: bookingTerms,
        email_sent: !!booking.email_sent,
        created_at: booking.created_at,
        payment_id: booking.payment_id
      };

      const { error } = await supabase
        .from("bookings")
        .upsert(payload, { onConflict: "booking_reference" });

      if (error) {
        console.error(`❌ Failed to sync ${booking.booking_reference}:`, error.message);
      } else {
        console.log(`✅ Synced ${booking.booking_reference}`);
      }
    }

    console.log("🎉 Synchronization complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Critical Sync Error:", err);
    process.exit(1);
  }
}

syncToSupabase();
