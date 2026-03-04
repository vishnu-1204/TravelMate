const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const db = new sqlite3.Database('auth.db');

db.get("SELECT * FROM bookings WHERE booking_reference = 'TM-SIM-ZD7VCO'", (err, row) => {
    let result;
    if (err) {
        result = { error: err.message };
    } else {
        result = { row };
    }
    fs.writeFileSync('query_out.json', JSON.stringify(result, null, 2));
    console.log('Result saved to query_out.json');
    db.close();
});
