alter table if exists public.travel_packages_cache
  add column if not exists group_form_link text;

comment on column public.travel_packages_cache.group_form_link is
  'Google Form URL for group tour booking redirection.';
