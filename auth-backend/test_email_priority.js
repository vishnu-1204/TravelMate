const BACKEND_URL = 'http://localhost:3003';
const fs = require('fs');

async function testBookingEmailPrioritization() {
    let log = "--- Testing Booking Email Prioritization ---\n";
    const logger = (msg) => { console.log(msg); log += msg + "\n"; };

    try {
        // 1. Register and login to get a valid token
        const testEmail = `registered_${Date.now()}@example.com`;
        const testPassword = 'Password123';

        logger(`1. Registering user: ${testEmail}`);
        const regRes = await fetch(`${BACKEND_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, password: testPassword })
        });
        const regData = await regRes.json();
        const token = regData.token;

        if (!token) throw new Error("Failed to get token");

        // 2. Attempt a simplified booking with a DIFFERENT email in the body
        const differentEmail = 'wrong_email@example.com';
        const bookingRef = `TM-TEST-${Date.now().toString().slice(-4)}`;
        
        logger(`2. Attempting booking with body email: ${differentEmail}`);
        const bookRes = await fetch(`${BACKEND_URL}/api/booking/process-dummy-payment`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                bookingData: {
                    booking_reference: bookingRef,
                    package_id: 'test-pkg',
                    package_title: 'Test Package',
                    email: differentEmail, // This should be overridden by the backend
                    total_amount: 1000,
                    travelers: 1,
                    first_name: 'Test',
                    last_name: 'User'
                }
            })
        });

        const bookData = await bookRes.json();
        logger(`Booking Status: ${bookRes.status}`);

        // 3. Check the database to see which email was actually stored
        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');
        const dbPath = path.resolve(__dirname, 'auth.db');
        const db = new sqlite3.Database(dbPath);

        await new Promise((resolve, reject) => {
            db.get("SELECT email FROM bookings WHERE booking_reference = ?", [bookingRef], (err, row) => {
                if (err) return reject(err);
                if (!row) return reject(new Error("Booking not found in DB"));
                
                logger(`Stored email in DB: ${row.email}`);
                if (row.email === testEmail) {
                    logger("✅ SUCCESS: Registered email correctly prioritized.");
                } else {
                    logger(`❌ FAILURE: Email in DB is ${row.email}, expected ${testEmail}`);
                }
                resolve();
            });
        });
        db.close();

    } catch (err) {
        logger(`❌ Error: ${err.message}`);
    }

    fs.writeFileSync('temp_out.txt', log);
}

testBookingEmailPrioritization();
