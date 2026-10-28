-- Anonymous page views. No IP addresses, full URLs, or user-agent strings stored.
create table if not exists public.website_page_views (
  id uuid primary key,
  session_id uuid not null,
  path text not null check (path in ('/','/services','/storm-damage','/our-work','/about','/contact')),
  referrer text not null default 'Direct / unknown' check (length(referrer) <= 253),
  device text not null check (device in ('Mobile','Tablet','Desktop')),
  created_at timestamptz not null default now()
);
create index if not exists website_page_views_created_at_idx on public.website_page_views(created_at);
alter table public.website_page_views enable row level security;
revoke all on public.website_page_views from public, anon, authenticated;
grant select, insert on public.website_page_views to service_role;

create or replace function public.website_report(report_days integer default 30)
returns jsonb language sql stable security invoker set search_path = '' as $$
with bounds as (
 select (now() at time zone 'America/New_York')::date as today,
        (now() at time zone 'America/New_York')::date - (case when report_days in (7,30,90) then report_days else 30 end - 1) as first_day
), events as (
 select v.*, (v.created_at at time zone 'America/New_York')::date as day
 from public.website_page_views v, bounds b
 where v.created_at >= (b.first_day::timestamp at time zone 'America/New_York') and v.created_at <= now()
), days as (
 select generate_series(b.first_day::timestamp,b.today::timestamp,interval '1 day')::date as day from bounds b
)
select jsonb_build_object(
 'timezone','America/New_York',
 'from',(select first_day from bounds), 'to',(select today from bounds),
 'page_views',(select count(*) from events),
 'visits',(select count(distinct session_id) from events),
 'leads',(select count(*) from public.leads l,bounds b where l.created_at >= (b.first_day::timestamp at time zone 'America/New_York') and l.created_at <= now()),
 'first_tracked_at',(select min(created_at) from public.website_page_views),
 'daily',(select coalesce(jsonb_agg(row_to_json(d) order by d.day),'[]'::jsonb) from (select days.day,count(e.id) as page_views,count(distinct e.session_id) as visits from days left join events e using(day) group by days.day) d),
 'pages',(select coalesce(jsonb_agg(row_to_json(p) order by p.views desc,p.label),'[]'::jsonb) from (select path as label,count(*) as views from events group by path) p),
 'referrers',(select coalesce(jsonb_agg(row_to_json(r) order by r.views desc,r.label),'[]'::jsonb) from (select referrer as label,count(*) as views from events group by referrer order by count(*) desc,referrer limit 20) r),
 'devices',(select coalesce(jsonb_agg(row_to_json(d) order by d.views desc,d.label),'[]'::jsonb) from (select device as label,count(*) as views from events group by device) d)
);
$$;
revoke all on function public.website_report(integer) from public, anon, authenticated;
grant execute on function public.website_report(integer) to service_role;
