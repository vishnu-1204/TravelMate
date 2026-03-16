const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'auth.db');
const db = new sqlite3.Database(dbPath);

const email = 'vv1496725@gmail.com';
db.all("SELECT * FROM booking_email_failures WHERE email = ?", [email], (err, rows) => {
  let output = "";
  if (err) {
    output = "Database Error: " + err.message;
  } else if (!rows || rows.length === 0) {
    output = "No email failures found for: " + email;
  } else {
    output = JSON.stringify(rows, null, 2);
  }
  fs.writeFileSync('temp_out.txt', output);
  db.close();
});
