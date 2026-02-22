alter table if exists public.travel_packages_cache
  add column if not exists categories text[] not null default '{}';

update public.travel_packages_cache
set categories = case
  when category = 'indian' then array['domestic']
  when category is not null then array[category]
  else array['international']
end
where categories = '{}'::text[] or categories is null;

create index if not exists travel_packages_cache_categories_gin_idx
  on public.travel_packages_cache
  using gin (categories);
