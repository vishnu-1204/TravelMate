create extension if not exists "pgcrypto";

-- PHASE 2: package versions
create table if not exists public.package_versions (
  id uuid primary key default gen_random_uuid(),
  package_id text not null,
  version_number integer not null,
  payload jsonb not null,
  payload_hash text not null,
  price numeric,
  duration_days integer,
  created_by text not null default 'system',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (package_id, version_number)
);

create index if not exists package_versions_package_id_idx on public.package_versions(package_id);
create index if not exists package_versions_active_idx on public.package_versions(package_id, is_active);
create unique index if not exists package_versions_payload_hash_unique on public.package_versions(package_id, payload_hash);

-- PHASE 1 + 3 + 6: lock metadata on bookings
alter table public.bookings
  add column if not exists package_version_id uuid references public.package_versions(id),
  add column if not exists locked_price_per_person numeric,
  add column if not exists locked_total_amount numeric,
  add column if not exists booking_terms jsonb,
  add column if not exists is_locked boolean not null default false;

create table if not exists public.booking_snapshots (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  package_id text not null,
  package_version_id uuid references public.package_versions(id),
  snapshot jsonb not null,
  terms_snapshot jsonb,
  locked_price_per_person numeric not null,
  locked_total_amount numeric not null,
  locked_hotel text,
  locked_transport text,
  availability_lock jsonb,
  created_at timestamptz not null default now()
);

create index if not exists booking_snapshots_package_id_idx on public.booking_snapshots(package_id);
create index if not exists booking_snapshots_package_version_idx on public.booking_snapshots(package_version_id);

alter table public.booking_snapshots enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'booking_snapshots'
      and policyname = 'Users can view own booking snapshots'
  ) then
    create policy "Users can view own booking snapshots"
      on public.booking_snapshots for select
      using (
        exists (
          select 1
          from public.bookings b
          where b.id = booking_id
            and b.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- prevent public writes directly to snapshots
revoke insert, update, delete on public.booking_snapshots from anon, authenticated;

create or replace function public.ensure_package_version_on_cache_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  last_version integer;
  last_hash text;
  next_version integer;
  computed_hash text;
begin
  computed_hash := encode(digest(coalesce(new.payload::text, ''), 'sha256'), 'hex');

  select pv.version_number, pv.payload_hash
    into last_version, last_hash
  from public.package_versions pv
  where pv.package_id = new.package_id
  order by pv.version_number desc
  limit 1;

  if last_hash is null or last_hash <> computed_hash then
    next_version := coalesce(last_version, 0) + 1;

    update public.package_versions
      set is_active = false
      where package_id = new.package_id
        and is_active = true;

    insert into public.package_versions (
      package_id,
      version_number,
      payload,
      payload_hash,
      price,
      duration_days,
      created_by,
      is_active
    ) values (
      new.package_id,
      next_version,
      new.payload,
      computed_hash,
      new.price,
      new.duration_days,
      'system',
      true
    )
    on conflict (package_id, payload_hash) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_package_cache_versioning on public.travel_packages_cache;
create trigger trg_package_cache_versioning
after insert or update of payload, price, duration_days on public.travel_packages_cache
for each row
execute function public.ensure_package_version_on_cache_change();

create or replace function public.lock_booking_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pkg_payload jsonb;
  active_version_id uuid;
  terms jsonb;
  locked_pp numeric;
  snapshot_doc jsonb;
  cancelled_policy text;
begin
  select t.payload
    into pkg_payload
  from public.travel_packages_cache t
  where t.package_id = new.package_id
  order by t.updated_at desc
  limit 1;

  if pkg_payload is null then
    pkg_payload := jsonb_build_object(
      'title', new.package_title,
      'destination', new.package_id,
      'price', case when new.travelers > 0 then round((new.total_amount / new.travelers)::numeric, 2) else new.total_amount end,
      'duration', 'As booked'
    );
  end if;

  select pv.id
    into active_version_id
  from public.package_versions pv
  where pv.package_id = new.package_id
    and pv.is_active = true
  order by pv.version_number desc
  limit 1;

  if active_version_id is null then
    insert into public.package_versions (
      package_id,
      version_number,
      payload,
      payload_hash,
      price,
      duration_days,
      created_by,
      is_active
    ) values (
      new.package_id,
      1,
      pkg_payload,
      encode(digest(coalesce(pkg_payload::text, ''), 'sha256'), 'hex'),
      coalesce((pkg_payload->>'price')::numeric, case when new.travelers > 0 then round((new.total_amount / new.travelers)::numeric, 2) else new.total_amount end),
      coalesce((pkg_payload->>'durationDays')::integer, 0),
      'snapshot_trigger',
      true
    )
    on conflict (package_id, payload_hash) do update set is_active = true
    returning id into active_version_id;
  end if;

  terms := coalesce(
    new.booking_terms,
    jsonb_build_object(
      'cancellationPolicy', coalesce(pkg_payload->>'cancellationPolicy', 'Cancellation charges may apply based on departure date.'),
      'termsVersion', 'v1',
      'lockedNotice', 'This package is locked after booking.'
    )
  );

  locked_pp := coalesce(
    new.locked_price_per_person,
    (pkg_payload->>'price')::numeric,
    case when new.travelers > 0 then round((new.total_amount / new.travelers)::numeric, 2) else new.total_amount end
  );

  cancelled_policy := coalesce(pkg_payload->>'cancellationPolicy', terms->>'cancellationPolicy', 'Cancellation charges may apply based on departure date.');

  snapshot_doc := jsonb_build_object(
    'packageName', coalesce(pkg_payload->>'title', new.package_title),
    'destination', coalesce(pkg_payload->>'destination', ''),
    'pricePerPerson', locked_pp,
    'totalPrice', new.total_amount,
    'itinerary', coalesce(pkg_payload->'itinerary', jsonb_build_object('days', '[]'::jsonb, 'nights', '[]'::jsonb)),
    'hotelDetails', jsonb_build_object(
      'hotelType', coalesce(pkg_payload->>'hotelType', 'As booked'),
      'included', coalesce(pkg_payload->'included', '[]'::jsonb)
    ),
    'transport', jsonb_build_object(
      'mode', coalesce(pkg_payload->>'transportMode', 'As booked')
    ),
    'activities', coalesce(pkg_payload->'highlights', '[]'::jsonb),
    'images', jsonb_build_object(
      'imageUrl', coalesce(pkg_payload->>'imageUrl', pkg_payload->>'image', ''),
      'imageAlt', coalesce(pkg_payload->>'imageAlt', new.package_title || ' package image')
    ),
    'cancellationPolicy', cancelled_policy,
    'termsAndConditions', terms,
    'lockedAt', now()
  );

  update public.bookings
    set package_version_id = active_version_id,
        locked_price_per_person = locked_pp,
        locked_total_amount = new.total_amount,
        booking_terms = terms,
        is_locked = true
  where id = new.id;

  insert into public.booking_snapshots (
    booking_id,
    package_id,
    package_version_id,
    snapshot,
    terms_snapshot,
    locked_price_per_person,
    locked_total_amount,
    locked_hotel,
    locked_transport,
    availability_lock
  ) values (
    new.id,
    new.package_id,
    active_version_id,
    snapshot_doc,
    terms,
    locked_pp,
    new.total_amount,
    coalesce(pkg_payload->>'hotelType', 'As booked'),
    coalesce(pkg_payload->>'transportMode', 'As booked'),
    jsonb_build_object('locked', true, 'note', 'Inventory and pricing locked at booking time')
  )
  on conflict (booking_id)
  do update set
    package_version_id = excluded.package_version_id,
    snapshot = excluded.snapshot,
    terms_snapshot = excluded.terms_snapshot,
    locked_price_per_person = excluded.locked_price_per_person,
    locked_total_amount = excluded.locked_total_amount,
    locked_hotel = excluded.locked_hotel,
    locked_transport = excluded.locked_transport,
    availability_lock = excluded.availability_lock;

  return null;
end;
$$;

drop trigger if exists trg_booking_snapshot_lock on public.bookings;
create trigger trg_booking_snapshot_lock
after insert on public.bookings
for each row
execute function public.lock_booking_snapshot();

create or replace function public.prevent_locked_booking_mutations()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.is_locked then
    if new.package_id is distinct from old.package_id
      or new.package_title is distinct from old.package_title
      or new.travelers is distinct from old.travelers
      or new.total_amount is distinct from old.total_amount
      or new.package_version_id is distinct from old.package_version_id
      or new.locked_price_per_person is distinct from old.locked_price_per_person then
      raise exception 'Booked package data is locked and cannot be changed';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_locked_booking_mutations on public.bookings;
create trigger trg_prevent_locked_booking_mutations
before update on public.bookings
for each row
execute function public.prevent_locked_booking_mutations();

create or replace function public.prevent_delete_package_with_active_bookings()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.bookings b
    where b.package_id = old.package_id
      and (
        b.payment_verified = true
        or b.payment_status in ('pending', 'paid', 'confirmed')
      )
  ) then
    raise exception 'Cannot delete package with active bookings';
  end if;

  return old;
end;
$$;

drop trigger if exists trg_prevent_delete_booked_package on public.travel_packages_cache;
create trigger trg_prevent_delete_booked_package
before delete on public.travel_packages_cache
for each row
execute function public.prevent_delete_package_with_active_bookings();
