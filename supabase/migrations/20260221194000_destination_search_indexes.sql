create extension if not exists pg_trgm;

create index if not exists idx_travel_packages_cache_destination_trgm
  on public.travel_packages_cache
  using gin (destination gin_trgm_ops);

create index if not exists idx_travel_packages_cache_title_trgm
  on public.travel_packages_cache
  using gin (title gin_trgm_ops);
