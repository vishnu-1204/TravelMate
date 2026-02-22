update public.travel_packages_cache
set country = 'India'
where
  lower(coalesce(country, '')) not in ('india', 'in', 'ind')
  and (
    lower(coalesce(destination, '')) like '%india%'
    or lower(coalesce(destination, '')) like '%ahmedabad%'
    or lower(coalesce(destination, '')) like '%gandhinagar%'
    or lower(coalesce(destination, '')) like '%chennai%'
    or lower(coalesce(destination, '')) like '%mahabalipuram%'
    or lower(coalesce(destination, '')) like '%goa%'
    or lower(coalesce(destination, '')) like '%delhi%'
    or lower(coalesce(destination, '')) like '%mumbai%'
    or lower(coalesce(destination, '')) like '%kerala%'
    or lower(coalesce(destination, '')) like '%jaipur%'
    or lower(coalesce(destination, '')) like '%kolkata%'
    or lower(coalesce(destination, '')) like '%agra%'
    or lower(coalesce(destination, '')) like '%manali%'
    or lower(coalesce(destination, '')) like '%ooty%'
    or lower(coalesce(destination, '')) like '%coorg%'
    or lower(coalesce(destination, '')) like '%rishikesh%'
    or lower(coalesce(destination, '')) like '%kashmir%'
    or lower(coalesce(destination, '')) like '%andaman%'
    or lower(coalesce(destination, '')) like '%kodaikanal%'
    or lower(coalesce(destination, '')) like '%mysore%'
    or lower(coalesce(destination, '')) like '%hampi%'
    or lower(coalesce(payload->>'title', '')) like '%india%'
    or lower(coalesce(payload->>'title', '')) like '%ahmedabad%'
    or lower(coalesce(payload->>'title', '')) like '%gandhinagar%'
    or lower(coalesce(payload->>'title', '')) like '%chennai%'
    or lower(coalesce(payload->>'title', '')) like '%mahabalipuram%'
    or lower(coalesce(payload->>'location', '')) like '%india%'
    or lower(coalesce(payload->>'location', '')) like '%ahmedabad%'
    or lower(coalesce(payload->>'location', '')) like '%gandhinagar%'
    or lower(coalesce(payload->>'location', '')) like '%chennai%'
    or lower(coalesce(payload->>'location', '')) like '%mahabalipuram%'
  );

update public.travel_packages_cache
set
  category = case when category = 'international' then 'domestic' else category end,
  categories = case
    when not categories @> array['domestic']::text[] then array_append(array_remove(categories, 'international'), 'domestic')
    else array_remove(categories, 'international')
  end
where lower(coalesce(country, '')) in ('india', 'in', 'ind');

update public.travel_packages_cache
set payload = jsonb_set(
  jsonb_set(payload, '{country}', to_jsonb(country), true),
  '{category}',
  to_jsonb(category),
  true
)
where lower(coalesce(country, '')) in ('india', 'in', 'ind');
