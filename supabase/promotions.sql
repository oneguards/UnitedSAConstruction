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
