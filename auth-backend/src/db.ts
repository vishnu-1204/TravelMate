import sqlite3 from "sqlite3";
import path from "path";

const dbPath = path.resolve(__dirname, "../auth.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Database connection error:", err.message);
  } else {
    console.log(`✅ SQLite connected at ${dbPath}`);
  }
});

// Enable WAL mode for better performance
db.run("PRAGMA journal_mode=WAL");

export const initDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      (err) => {
        if (err) {
          console.error("❌ Table creation error:", err.message);
          reject(err);
        } else {
          console.log("✅ Users table ready");
          resolve();
        }
      }
    );
  });
};

export default db;
