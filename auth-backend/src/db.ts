import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";

const logFile = path.resolve(__dirname, "../persistent_server.log");
const logger = (msg: string, ...args: any[]) => {
  const formattedMsg = `[${new Date().toISOString()}] [DB] ${msg} ${args.map(a => JSON.stringify(a)).join(" ")}\n`;
  fs.appendFileSync(logFile, formattedMsg);
  console.log(msg, ...args);
};

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
  logger("Checking users table columns...");
  const columns = await all<{ name: string }>("PRAGMA table_info(users)");
  const existing = new Set(columns.map((column) => column.name));
  logger(`Existing columns: ${Array.from(existing).join(", ")}`);

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
  logger("Initalizing database...");
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger("Database connection error:", err.message);
        reject(err);
      } else {
        logger(`SQLite connected at ${dbPath}`);
        db.run("PRAGMA journal_mode=WAL", (pragmaErr) => {
          if (pragmaErr) logger("Failed to enable WAL mode:", pragmaErr.message);
          else logger("WAL mode enabled");
          
          logger("Running CREATE TABLE IF NOT EXISTS users...");
          const tableQuery = `CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              email TEXT UNIQUE NOT NULL,
              password TEXT NOT NULL,
              email_verified INTEGER NOT NULL DEFAULT 0,
              verification_token TEXT,
              verification_token_expires_at DATETIME,
              verified_at DATETIME,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`;
          
          db.run(
            tableQuery,
            async (err) => {
              if (err) {
                logger("CRITICAL: Table creation error:", err.message);
                reject(err);
                return;
              }
              logger("Users table verified/created successfully.");

              try {
                await ensureUsersTableColumns();
                logger("Users table ready");

                // Create bookings table
                const bookingsTable = `CREATE TABLE IF NOT EXISTS bookings (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id TEXT NOT NULL,
                  booking_reference TEXT UNIQUE NOT NULL,
                  package_title TEXT NOT NULL,
                  destination TEXT,
                  duration TEXT,
                  travel_date TEXT,
                  travelers INTEGER DEFAULT 1,
                  traveler_name TEXT,
                  room_type TEXT,
                  email TEXT NOT NULL,
                  phone TEXT,
                  total_amount REAL NOT NULL,
                  airline TEXT,
                  departure_time TEXT,
                  payment_status TEXT DEFAULT 'paid',
                  booking_status TEXT DEFAULT 'confirmed',
                  email_sent INTEGER DEFAULT 0,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`;
                await run(bookingsTable);
                logger("Bookings table ready");

                resolve();
              } catch (migrationError: any) {
                logger("Migration error:", migrationError.message, migrationError.stack);
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
