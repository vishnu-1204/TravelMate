alter table if exists public.travel_packages_cache
  add column if not exists country text not null default 'Unknown';

update public.travel_packages_cache
set country = coalesce(
  nullif(payload->>'country', ''),
  nullif(trim(both ' ' from regexp_replace(coalesce(payload->>'location', destination), '^.*,\s*', '')), ''),
  'Unknown'
)
where country is null or country = '' or country = 'Unknown';

update public.travel_packages_cache
set
  category = case
    when lower(country) in ('india', 'in', 'ind') and category = 'international' then 'domestic'
    when lower(country) not in ('india', 'in', 'ind') and category = 'domestic' then 'international'
    else category
  end,
  categories = case
    when lower(country) in ('india', 'in', 'ind') then (
      select array_agg(distinct item)
      from unnest(array_append(array_remove(coalesce(categories, '{}'::text[]), 'international'), 'domestic')) as item
    )
    else (
      select array_agg(distinct item)
      from unnest(array_append(array_remove(coalesce(categories, '{}'::text[]), 'domestic'), 'international')) as item
    )
  end;

update public.travel_packages_cache
set payload = jsonb_set(
  jsonb_set(payload, '{country}', to_jsonb(country), true),
  '{category}',
  to_jsonb(category),
  true
);

create index if not exists travel_packages_cache_country_idx
  on public.travel_packages_cache(country);
