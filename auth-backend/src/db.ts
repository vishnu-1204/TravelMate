import sqlite3 from "sqlite3";
import path from "path";

const dbPath = path.resolve(__dirname, "../auth.db");

let db: sqlite3.Database;

const run = (sql: string) =>
  new Promise<void>((resolve, reject) => {
    if (!db) return reject(new Error("Database not initialized"));
    db.run(sql, (err) => {
      if (err) return reject(err);
      return resolve();
    });
  });

const all = <T = unknown>(sql: string) =>
  new Promise<T[]>((resolve, reject) => {
    if (!db) return reject(new Error("Database not initialized"));
    db.all(sql, (err, rows: T[]) => {
      if (err) return reject(err);
      return resolve(rows);
    });
  });

const ensureUsersTableColumns = async () => {
  console.log("Checking users table columns...");
  const columns = await all<{ name: string }>("PRAGMA table_info(users)");
  const existing = new Set(columns.map((column) => column.name));
  console.log(`Existing columns: ${Array.from(existing).join(", ")}`);

  const requiredColumns: Array<{ name: string; ddl: string }> = [
    { name: "email_verified", ddl: "ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0" },
    { name: "verification_token", ddl: "ALTER TABLE users ADD COLUMN verification_token TEXT" },
    { name: "verification_token_expires_at", ddl: "ALTER TABLE users ADD COLUMN verification_token_expires_at DATETIME" },
    { name: "verified_at", ddl: "ALTER TABLE users ADD COLUMN verified_at DATETIME" },
  ];

  for (const column of requiredColumns) {
    if (!existing.has(column.name)) {
      await run(column.ddl);
      console.log(`Added users.${column.name}`);
    }
  }
};

export const initDatabase = (): Promise<void> => {
  console.log("Initalizing database...");
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("Database connection error:", err.message);
        reject(err);
      } else {
        console.log(`SQLite connected at ${dbPath}`);
        db.run("PRAGMA journal_mode=WAL", (pragmaErr) => {
          if (pragmaErr) console.error("Failed to enable WAL mode:", pragmaErr.message);
          else console.log("WAL mode enabled");
          
          console.log("Running CREATE TABLE IF NOT EXISTS users...");
          db.run(
            `CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              email TEXT UNIQUE NOT NULL,
              password TEXT NOT NULL,
              email_verified INTEGER NOT NULL DEFAULT 0,
              verification_token TEXT,
              verification_token_expires_at DATETIME,
              verified_at DATETIME,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            async (err) => {
              if (err) {
                console.error("Table creation error:", err.message);
                reject(err);
                return;
              }

              try {
                await ensureUsersTableColumns();
                console.log("Users table ready");
                resolve();
              } catch (migrationError) {
                reject(migrationError);
              }
            }
          );
        });
      }
    });
  });
};

export const getDb = () => {
  if (!db) throw new Error("Database not initialized");
  return db;
};
