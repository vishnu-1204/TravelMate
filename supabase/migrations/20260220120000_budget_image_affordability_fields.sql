alter table if exists public.travel_packages_cache
  add column if not exists budget_type text not null default 'medium',
  add column if not exists price_range text not null default '₹15,001 - ₹30,000',
  add column if not exists unique_image_id text not null default '',
  add column if not exists affordability_score numeric not null default 50,
  add column if not exists is_luxury boolean not null default false;

update public.travel_packages_cache
set
  budget_type = coalesce(nullif(payload->>'budgetType', ''), budget_type),
  price_range = coalesce(nullif(payload->>'priceRange', ''), price_range),
  unique_image_id = coalesce(nullif(payload->>'uniqueImageId', ''), unique_image_id),
  affordability_score = coalesce((payload->>'affordabilityScore')::numeric, affordability_score),
  is_luxury = coalesce((payload->>'isLuxury')::boolean, is_luxury);

create index if not exists travel_packages_cache_budget_type_idx
  on public.travel_packages_cache(budget_type);

create index if not exists travel_packages_cache_affordability_idx
  on public.travel_packages_cache(affordability_score desc);

create index if not exists travel_packages_cache_is_luxury_idx
  on public.travel_packages_cache(is_luxury);

create unique index if not exists travel_packages_cache_unique_image_id_uidx
  on public.travel_packages_cache(unique_image_id)
  where unique_image_id <> '';
