alter table public.services add column show_card boolean not null default true;
alter table public.social_links add column platform text not null default 'custom' check(platform in ('custom','facebook','google_maps','google_reviews'));
create table public.brands (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 200),
 description text not null default '',
 image_url text not null default '' check(image_url='' or image_url ~* '^https://'),
 url text not null default '' check(url='' or url ~* '^https://'),
 published boolean not null default false,
 sort_order integer not null default 0,
 created_at timestamptz not null default now()
);
alter table public.brands enable row level security;
revoke all on table public.brands from public, anon, authenticated;
grant select,insert,update,delete on table public.brands to service_role;
comment on table public.brands is 'Server-only access through Netlify API. RLS intentionally denies direct client access.';
