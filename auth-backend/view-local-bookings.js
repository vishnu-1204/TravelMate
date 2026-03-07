const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'auth.db');
const db = new sqlite3.Database(dbPath);

console.log(`\n🔍 Scanning local database at: ${dbPath}\n`);

db.all("SELECT id, booking_reference, package_title, travel_date, travelers, total_amount, payment_status FROM bookings ORDER BY created_at DESC", (err, rows) => {
  if (err) {
    console.error("❌ Error reading database:", err.message);
    process.exit(1);
  }

  if (rows.length === 0) {
    console.log("📭 No bookings found in the local database.");
  } else {
    console.table(rows);
    console.log(`\n✅ Found ${rows.length} bookings.\n`);
  }
  
  db.close();
});
