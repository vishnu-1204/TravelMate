const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'auth.db');
const db = new sqlite3.Database(dbPath);

const email = 'rajreo1061@gmail.com';

db.run(
  "UPDATE users SET email_verified = 1, verified_at = CURRENT_TIMESTAMP WHERE email = ?",
  [email],
  function(err) {
    if (err) {
      console.error('Error updating user:', err.message);
    } else {
      console.log(`Successfully verified ${email}. Rows affected: ${this.changes}`);
    }
    db.close();
  }
);
