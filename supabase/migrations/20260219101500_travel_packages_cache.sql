create extension if not exists "pgcrypto";

create table if not exists public.travel_packages_cache (
  id uuid primary key default gen_random_uuid(),
  package_id text not null unique,
  source text not null,
  title text not null,
  destination text not null,
  category text not null,
  duration_days integer not null,
  price numeric not null,
  rating numeric not null,
  budget_friendly boolean not null default false,
  trending_score numeric not null default 0,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists travel_packages_cache_category_idx on public.travel_packages_cache(category);
create index if not exists travel_packages_cache_title_idx on public.travel_packages_cache(title);
create index if not exists travel_packages_cache_destination_idx on public.travel_packages_cache(destination);
create index if not exists travel_packages_cache_price_idx on public.travel_packages_cache(price);
create index if not exists travel_packages_cache_duration_idx on public.travel_packages_cache(duration_days);
create index if not exists travel_packages_cache_rating_idx on public.travel_packages_cache(rating);
create index if not exists travel_packages_cache_trending_idx on public.travel_packages_cache(trending_score desc);
create index if not exists travel_packages_cache_expires_idx on public.travel_packages_cache(expires_at);
