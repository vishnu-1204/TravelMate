-- consolidated_booking_fix.sql
-- Run this in your Supabase SQL Editor to add missing columns to the bookings table

-- 1. Ensure package_versions table exists (required for some columns)
CREATE TABLE IF NOT EXISTS public.package_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  payload JSONB NOT NULL,
  payload_hash TEXT NOT NULL,
  price NUMERIC,
  duration_days INTEGER,
  created_by TEXT NOT NULL DEFAULT 'system',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (package_id, version_number)
);

-- 2. Add Phase 2/3 columns (Locking & Terms)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS package_version_id UUID REFERENCES public.package_versions(id),
  ADD COLUMN IF NOT EXISTS locked_price_per_person NUMERIC,
  ADD COLUMN IF NOT EXISTS locked_total_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS booking_terms JSONB,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Add Phase 4 columns (Email & Status)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS booking_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ticket_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS email_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_last_error TEXT,
  ADD COLUMN IF NOT EXISTS email_last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

-- 4. Create booking_snapshots table if missing (required for detail views)
CREATE TABLE IF NOT EXISTS public.booking_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  package_id TEXT NOT NULL,
  package_version_id UUID REFERENCES public.package_versions(id),
  snapshot JSONB NOT NULL,
  terms_snapshot JSONB,
  locked_price_per_person NUMERIC NOT NULL,
  locked_total_amount NUMERIC NOT NULL,
  locked_hotel TEXT,
  locked_transport TEXT,
  availability_lock JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS bookings_booking_reference_idx ON public.bookings(booking_reference);
CREATE INDEX IF NOT EXISTS bookings_email_sent_idx ON public.bookings(email_sent);
CREATE INDEX IF NOT EXISTS booking_snapshots_package_id_idx ON public.booking_snapshots(package_id);

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Database schema updated successfully.';
END $$;
