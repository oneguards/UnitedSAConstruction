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

-- Managed website content additions
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

-- Multiple project photos and completion dates
-- Additive change to the existing project; run once.
alter table public.projects add column image_urls text[] not null default '{}' check(cardinality(image_urls)<=30);
alter table public.projects add column completed_on date;
update public.projects set image_urls=array[image_url] where image_url<>'' and cardinality(image_urls)=0;
-- Uploads are signed by the server only after checking admin_users.
-- Public reads are intentional: these files are website portfolio photos.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('project-photos','project-photos',true,10485760,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do nothing;
-- Additive setup. Offers default to off; no campaign is created or activated here.
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 120),
  description text not null default '' check (length(description) <= 600),
  placement text not null default 'banner' check (placement in ('banner','popup','both')),
  button_label text not null default '' check (length(button_label) <= 60),
  url text not null default '' check (url = '' or url ~* '^https://'),
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.promotions enable row level security;
revoke all on public.promotions from public, anon, authenticated;
grant select, insert, update, delete on public.promotions to service_role;
