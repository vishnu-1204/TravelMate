-- schema.sql
-- SQLite/libSQL-compatible database definition for Turso Cloud

-- 1. Users table (authentication)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  aadhaar_hash TEXT,
  aadhaar_last4 TEXT,
  date_of_birth TEXT,
  gender TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  alternate_email TEXT,
  occupation TEXT,
  bio TEXT,
  avatar_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  booking_reference TEXT UNIQUE,
  package_id TEXT,
  package_title TEXT,
  destination TEXT,
  duration TEXT,
  travel_date TEXT,
  travelers INTEGER,
  traveler_name TEXT,
  room_type TEXT,
  email TEXT,
  phone TEXT,
  total_amount REAL,
  airline TEXT,
  departure_time TEXT,
  payment_status TEXT,
  booking_status TEXT,
  payment_verified INTEGER DEFAULT 0,
  first_name TEXT,
  last_name TEXT,
  payment_id TEXT,
  email_sent INTEGER DEFAULT 0,
  booking_terms TEXT, -- stored as JSON string
  cancellation_reason TEXT,
  cancelled_at TEXT,
  refund_amount REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Booking Snapshots table
CREATE TABLE IF NOT EXISTS booking_snapshots (
  id TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
  snapshot TEXT, -- JSON string
  locked_transport TEXT, -- JSON string
  locked_hotel TEXT, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Contact Messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  subject TEXT,
  message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Booking Email Failures table
CREATE TABLE IF NOT EXISTS booking_email_failures (
  id TEXT PRIMARY KEY,
  booking_reference TEXT,
  email TEXT,
  payload_json TEXT, -- JSON string
  error_message TEXT,
  attempts INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Travel Packages Cache table
CREATE TABLE IF NOT EXISTS travel_packages_cache (
  package_id TEXT PRIMARY KEY,
  source TEXT,
  title TEXT,
  destination TEXT,
  country TEXT,
  category TEXT,
  categories TEXT, -- JSON string
  budget_type TEXT,
  price_range TEXT,
  unique_image_id TEXT,
  affordability_score REAL,
  itinerary_json TEXT, -- JSON string
  is_luxury INTEGER DEFAULT 0,
  is_group_tour INTEGER DEFAULT 0,
  group_departures_json TEXT, -- JSON string
  guide_name TEXT,
  guide_phone TEXT,
  duration_days INTEGER,
  price REAL,
  rating REAL,
  budget_friendly INTEGER DEFAULT 1,
  trending_score REAL,
  payload TEXT, -- JSON string
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME
);

-- 8. Package Versions table
CREATE TABLE IF NOT EXISTS package_versions (
  id TEXT PRIMARY KEY,
  package_id TEXT,
  version_number INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  is_active INTEGER DEFAULT 1,
  price REAL,
  duration_days INTEGER
);

-- 9. Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  package_id TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  rating REAL,
  comment TEXT,
  is_verified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
