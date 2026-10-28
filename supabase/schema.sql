-- Applied to the existing United SA Construction project.
-- For a NEW empty database only; do not rerun against existing tables.
-- Administrator membership must be granted separately after account approval.
create table public.admin_users (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table public.leads (
 id uuid primary key default gen_random_uuid(),
 kind text not null default 'estimate' check (kind in ('estimate','contact')),
 name text not null check (length(trim(name)) between 1 and 5000),
 email text not null default '' check(length(email)<=5000),
 phone text not null default '' check(length(phone)<=5000),
 service text not null default '' check(length(service)<=200),
 location text not null default '' check(length(location)<=250),
 message text not null check(length(trim(message)) between 1 and 5000),
 status text not null default 'new' check(status in ('new','contacted','quoted','won','lost')),
 notes text not null default '' check(length(notes)<=5000),
 created_at timestamptz not null default now(),
 check(length(trim(email))>0 or length(trim(phone))>0)
);
create index leads_created_at_idx on public.leads(created_at desc);
create table public.projects (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 1 and 250),
 description text not null default '', service text not null default '', location text not null default '',
 image_url text not null default '' check(image_url='' or image_url ~* '^https://'),
 published boolean not null default false, sort_order integer not null default 0,
 created_at timestamptz not null default now()
);
create table public.services (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 200),
 description text not null default '',
 image_url text not null default '' check(image_url='' or image_url ~* '^https://'),
 published boolean not null default false, sort_order integer not null default 0,
 created_at timestamptz not null default now()
);
create table public.social_links (
 id uuid primary key default gen_random_uuid(),
 label text not null check(length(trim(label)) between 1 and 200),
 url text not null check(url ~* '^https://'),
 published boolean not null default false, sort_order integer not null default 0,
 created_at timestamptz not null default now()
);
create table public.licenses (
 id uuid primary key default gen_random_uuid(),
 license_number text not null check(length(trim(license_number)) between 1 and 200),
 license_type text not null default '', state text not null default '', holder text not null default '',
 expires_on date,
 published boolean not null default false, sort_order integer not null default 0,
 created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on table public.admin_users from public, anon, authenticated;
grant select, insert, update, delete on table public.admin_users to service_role;
comment on table public.admin_users is 'Server-only access through Netlify API. RLS without browser policies intentionally denies direct client access.';
alter table public.leads enable row level security;
revoke all on table public.leads from public, anon, authenticated;
grant select, insert, update, delete on table public.leads to service_role;
comment on table public.leads is 'Server-only access through Netlify API. RLS without browser policies intentionally denies direct client access.';
alter table public.projects enable row level security;
revoke all on table public.projects from public, anon, authenticated;
grant select, insert, update, delete on table public.projects to service_role;
comment on table public.projects is 'Server-only access through Netlify API. RLS without browser policies intentionally denies direct client access.';
alter table public.services enable row level security;
revoke all on table public.services from public, anon, authenticated;
grant select, insert, update, delete on table public.services to service_role;
comment on table public.services is 'Server-only access through Netlify API. RLS without browser policies intentionally denies direct client access.';
alter table public.social_links enable row level security;
revoke all on table public.social_links from public, anon, authenticated;
grant select, insert, update, delete on table public.social_links to service_role;
comment on table public.social_links is 'Server-only access through Netlify API. RLS without browser policies intentionally denies direct client access.';
alter table public.licenses enable row level security;
revoke all on table public.licenses from public, anon, authenticated;
grant select, insert, update, delete on table public.licenses to service_role;
comment on table public.licenses is 'Server-only access through Netlify API. RLS without browser policies intentionally denies direct client access.';
