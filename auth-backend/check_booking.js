const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('auth.db');

db.get("SELECT * FROM bookings WHERE booking_reference = 'TM-SIM-ZD7VCO'", (err, row) => {
    if (err) {
        console.error('Error querying DB:', err);
        process.exit(1);
    }
    console.log('Query result:', JSON.stringify(row));
    db.close();
});
