const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const dbPath = path.resolve(__dirname, 'auth.db');
const db = new sqlite3.Database(dbPath);

console.log("📨 Attempting to send mail for the most recent registration/booking...");

db.get("SELECT booking_reference, user_id FROM bookings ORDER BY created_at DESC LIMIT 1", async (err, row) => {
  if (err) {
    console.error("❌ Database error:", err.message);
    process.exit(1);
  }

  if (!row) {
    console.log("📭 No bookings found in SQLite to send mail for.");
    process.exit(0);
  }

  const { booking_reference, user_id } = row;
  console.log(`📍 Found recent booking: ${booking_reference} for User: ${user_id}`);

  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3003';
    console.log(`📤 Triggering confirmation via: ${backendUrl}/api/booking/send-booking-confirmation`);
    
    const response = await axios.post(`${backendUrl}/api/booking/send-booking-confirmation`, {
      bookingReference: booking_reference,
      userId: user_id
    });

    console.log("✅ Mail Service Response:", response.data);
  } catch (axiosError) {
    console.error("❌ Failed to trigger email:", axiosError.response?.data || axiosError.message);
    
    console.log("\n💡 Possible causes:");
    console.log("1. The backend server is not running (npm run dev in auth-backend).");
    console.log("2. RESEND_API_KEY in .env is invalid or expired.");
  } finally {
    db.close();
  }
});
