const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'auth.db');
const db = new sqlite3.Database(dbPath);

const email = 'vv1496725@gmail.com';
const verifiedAt = new Date().toISOString();

db.run(
  "UPDATE users SET email_verified = 1, verified_at = ?, verification_token = NULL, verification_token_expires_at = NULL WHERE email = ?",
  [verifiedAt, email],
  function (err) {
    let output = "";
    if (err) {
      output = "Error verifying user: " + err.message;
    } else if (this.changes === 0) {
      output = "No user found with email: " + email;
    } else {
      output = "User " + email + " successfully verified.";
    }
    fs.writeFileSync('temp_out.txt', output);
    db.close();
  }
);
