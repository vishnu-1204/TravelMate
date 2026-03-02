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
    { name: "reset_token", ddl: "ALTER TABLE users ADD COLUMN reset_token TEXT" },
    { name: "reset_token_expires_at", ddl: "ALTER TABLE users ADD COLUMN reset_token_expires_at DATETIME" },
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
                  package_id TEXT,
                  package_title TEXT NOT NULL,
                  destination TEXT,
                  duration TEXT,
                  travel_date TEXT,
                  travelers INTEGER DEFAULT 1,
                  traveler_name TEXT,
                  first_name TEXT,
                  last_name TEXT,
                  room_type TEXT,
                  email TEXT NOT NULL,
                  phone TEXT,
                  total_amount REAL NOT NULL,
                  airline TEXT,
                  departure_time TEXT,
                  payment_id TEXT,
                  payment_status TEXT DEFAULT 'paid',
                  payment_verified INTEGER DEFAULT 0,
                  booking_terms TEXT,
                  booking_status TEXT DEFAULT 'confirmed',
                  email_sent INTEGER DEFAULT 0,
                  email_sent_at DATETIME,
                  email_attempts INTEGER DEFAULT 0,
                  email_last_attempt_at DATETIME,
                  email_last_error TEXT,
                  ticket_pdf_url TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`;
                await run(bookingsTable);

                const ensureBookingsTableColumns = async () => {
                  logger("Checking bookings table columns...");
                  const columns = await all<{ name: string }>("PRAGMA table_info(bookings)");
                  const existing = new Set(columns.map((column) => column.name));
                  
                  const migrations = [
                    { name: "package_id", ddl: "ALTER TABLE bookings ADD COLUMN package_id TEXT" },
                    { name: "first_name", ddl: "ALTER TABLE bookings ADD COLUMN first_name TEXT" },
                    { name: "last_name", ddl: "ALTER TABLE bookings ADD COLUMN last_name TEXT" },
                    { name: "payment_id", ddl: "ALTER TABLE bookings ADD COLUMN payment_id TEXT" },
                    { name: "payment_verified", ddl: "ALTER TABLE bookings ADD COLUMN payment_verified INTEGER DEFAULT 0" },
                    { name: "booking_terms", ddl: "ALTER TABLE bookings ADD COLUMN booking_terms TEXT" },
                    { name: "email_sent_at", ddl: "ALTER TABLE bookings ADD COLUMN email_sent_at DATETIME" },
                    { name: "email_attempts", ddl: "ALTER TABLE bookings ADD COLUMN email_attempts INTEGER DEFAULT 0" },
                    { name: "email_last_attempt_at", ddl: "ALTER TABLE bookings ADD COLUMN email_last_attempt_at DATETIME" },
                    { name: "email_last_error", ddl: "ALTER TABLE bookings ADD COLUMN email_last_error TEXT" },
                    { name: "ticket_pdf_url", ddl: "ALTER TABLE bookings ADD COLUMN ticket_pdf_url TEXT" }
                  ];

                  for (const m of migrations) {
                    if (!existing.has(m.name)) {
                      await run(m.ddl);
                      logger(`Added bookings.${m.name}`);
                    }
                  }
                };

                await ensureBookingsTableColumns();
                logger("Bookings table ready");

                const ensurePackagesTableColumns = async () => {
                  logger("Checking packages table columns...");
                  const columns = await all<{ name: string }>("PRAGMA table_info(packages)");
                  const existing = new Set(columns.map((column) => column.name));
                  
                  if (!existing.has("is_group_tour")) {
                    await run("ALTER TABLE packages ADD COLUMN is_group_tour INTEGER DEFAULT 0");
                    logger("Added packages.is_group_tour");
                  }
                  if (!existing.has("group_departures_json")) {
                    await run("ALTER TABLE packages ADD COLUMN group_departures_json TEXT");
                    logger("Added packages.group_departures_json");
                  }
                };

                // Create packages table
                const packagesTable = `CREATE TABLE IF NOT EXISTS packages (
                  id TEXT PRIMARY KEY,
                  title TEXT NOT NULL,
                  destination TEXT NOT NULL,
                  description TEXT,
                  price REAL,
                  duration TEXT,
                  is_group_tour INTEGER DEFAULT 0,
                  group_departures_json TEXT
                )`;
                await run(packagesTable);
                await ensurePackagesTableColumns();
                logger("Packages table ready");

                // Create itineraries table
                const itinerariesTable = `CREATE TABLE IF NOT EXISTS itineraries (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  package_id TEXT NOT NULL,
                  day_number INTEGER NOT NULL,
                  activity_title TEXT NOT NULL,
                  description TEXT,
                  FOREIGN KEY(package_id) REFERENCES packages(id)
                )`;
                await run(itinerariesTable);
                logger("Itineraries table ready");

                // Create booking_email_failures table
                const failuresTable = `CREATE TABLE IF NOT EXISTS booking_email_failures (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  booking_reference TEXT NOT NULL,
                  email TEXT NOT NULL,
                  payload_json TEXT NOT NULL,
                  attempts INTEGER DEFAULT 0,
                  last_attempt DATETIME,
                  error_message TEXT,
                  status TEXT DEFAULT 'pending',
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`;
                await run(failuresTable);
                logger("Booking email failures table ready");

                // Create contact_messages table
                const contactMessagesTable = `CREATE TABLE IF NOT EXISTS contact_messages (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  email TEXT NOT NULL,
                  phone TEXT,
                  subject TEXT,
                  message TEXT NOT NULL,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`;
                await run(contactMessagesTable);
                logger("Contact messages table ready");

                // Seed data if empty
                const pkgCount = await all<{ count: number }>("SELECT COUNT(*) as count FROM packages");
                if (pkgCount[0].count === 0) {
                  logger("Seeding sample packages and itineraries...");
                  await run(`INSERT INTO packages (id, title, destination, description, price, duration) VALUES 
                    ('pkg-kasol-01', 'High Altitude Kasol Expedition', 'Kasol', 'A thrilling journey into the heart of Parvati Valley.', 15000, '3 Days / 2 Nights'),
                    ('pkg-kerala-01', 'Kerala Backwaters Luxury', 'Kerala', 'Serene houseboat stays and lush tropical landscapes.', 25000, '4 Days / 3 Nights')`);
                  
                  await run(`INSERT INTO itineraries (package_id, day_number, activity_title, description) VALUES 
                    ('pkg-kasol-01', 1, 'Arrival in Kasol', 'Check-in to your riverside camp and enjoy a local cafe crawl.'),
                    ('pkg-kasol-01', 2, 'KheerGanga Trek', 'A 12km trek to the natural hot springs with breathtaking views.'),
                    ('pkg-kasol-01', 3, 'Manikaran Visit & Departure', 'Visit the holy hot springs at Manikaran and board your return bus.'),
                    ('pkg-kerala-01', 1, 'Kochi Arrival', 'Pickup from Kochi airport and transfer to Munnar tea gardens.'),
                    ('pkg-kerala-01', 2, 'Munnar Sightseeing', 'Visit Eravikulam National Park and Mattupetty Dam.'),
                    ('pkg-kerala-01', 3, 'Alleppey Houseboat', 'A day of cruising the backwaters on a private luxury houseboat.'),
                    ('pkg-kerala-01', 4, 'Departure from Kochi', 'Final shopping and transfer to Kochi airport for departure.')`);
                  logger("Seed data inserted successfully.");
                }

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
