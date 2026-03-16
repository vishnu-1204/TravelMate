const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'auth.db');
const db = new sqlite3.Database(dbPath);

const verifiedAt = new Date().toISOString();

db.run(
  "UPDATE users SET email_verified = 1, verified_at = COALESCE(verified_at, ?), verification_token = NULL, verification_token_expires_at = NULL WHERE email_verified = 0",
  [verifiedAt],
  function (err) {
    let output = "";
    if (err) {
      output = "Error updating users: " + err.message;
    } else {
      output = "Successfully updated " + this.changes + " users to verified status.";
    }
    fs.writeFileSync('temp_out.txt', output);
    db.close();
  }
);
