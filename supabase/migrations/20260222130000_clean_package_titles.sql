with cleaned as (
  select
    package_id,
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(
                      regexp_replace(
                        regexp_replace(
                          regexp_replace(
                            regexp_replace(
                              coalesce(payload->>'title', title, destination, 'Travel Tour'),
                              '\m(budget|cheap|affordable|value|premium|luxury|best|offer|deal|saver)\M',
                              ' ',
                              'gi'
                            ),
                            '\mlow\s+cost\M',
                            ' ',
                            'gi'
                          ),
                          '\mtrip\s*[0-9]+\M',
                          ' ',
                          'gi'
                        ),
                        '[0-9]+',
                        ' ',
                        'g'
                      ),
                      '[^A-Za-z[:space:]]+',
                      ' ',
                      'g'
                    ),
                    '\m(top|ranked|no)\M',
                    ' ',
                    'gi'
                  ),
                  '\s+',
                  ' ',
                  'g'
                ),
                '^\s+|\s+$',
                '',
                'g'
              ),
              '\m(tour|trip|holiday|escape|getaway|journey|retreat)\M$',
              '',
              'i'
            ),
            '\s+',
            ' ',
            'g'
          ),
          '^\s+|\s+$',
          '',
          'g'
        ),
        '$',
        ' Tour'
      )
    ) as new_title
  from public.travel_packages_cache
)
update public.travel_packages_cache t
set
  title = c.new_title,
  payload = jsonb_set(t.payload, '{title}', to_jsonb(c.new_title), true),
  updated_at = now()
from cleaned c
where t.package_id = c.package_id;
