import sqlite3 from "sqlite3";

const db = new sqlite3.Database("auth.db", (err) => {
  if (err) {
    console.log("Database error:", err);
  } else {
    console.log("SQLite connected successfully ✅");
  }
});

export default db;
