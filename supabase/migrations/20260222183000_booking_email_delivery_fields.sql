alter table public.bookings
  add column if not exists email_sent boolean not null default false,
  add column if not exists booking_status text not null default 'pending',
  add column if not exists ticket_pdf_url text,
  add column if not exists email_attempts integer not null default 0,
  add column if not exists email_last_error text,
  add column if not exists email_last_attempt_at timestamptz,
  add column if not exists email_sent_at timestamptz;

create index if not exists bookings_booking_reference_idx on public.bookings(booking_reference);
create index if not exists bookings_email_sent_idx on public.bookings(email_sent);
