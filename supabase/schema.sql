create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if tg_table_name = 'listings' then
    new.expires_at = coalesce(new.posted_at, now()) + interval '60 days';
  end if;
  return new;
end;
$$;

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  sender_phone text not null,
  sender_name text,
  group_id text,
  group_name text,
  is_housing_post boolean not null default true,
  listing_type text default 'sublease'
    check (listing_type is null or listing_type in ('sublease', 'lease_transfer', 'roommate_needed', 'looking_for_place')),
  rent_monthly integer check (rent_monthly is null or rent_monthly >= 0),
  utilities_included boolean,
  gender_preference text
    check (gender_preference is null or gender_preference in ('male', 'female', 'mixed')),
  dietary_preference text
    check (dietary_preference is null or dietary_preference in ('veg', 'non_veg', 'vegan')),
  location_text text,
  normalized_location_text text not null,
  move_in_date date,
  move_out_date date,
  private_room boolean,
  private_bath boolean,
  amenities jsonb not null default '{}'::jsonb,
  contact_phone text,
  summary text,
  source_message text not null,
  latitude double precision not null,
  longitude double precision not null,
  posted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '60 days'),
  constraint listings_dedup_key unique (sender_phone, normalized_location_text, rent_monthly)
);

alter table public.listings
  add column if not exists is_housing_post boolean not null default true;

alter table public.listings
  add column if not exists expires_at timestamptz not null default (now() + interval '60 days');

create index if not exists listings_posted_at_idx on public.listings (posted_at desc);
create index if not exists listings_expires_at_idx on public.listings (expires_at);
create index if not exists listings_location_idx on public.listings (latitude, longitude);
create index if not exists listings_filters_idx
  on public.listings (listing_type, gender_preference, dietary_preference, rent_monthly);

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before insert or update on public.listings
  for each row execute function public.set_updated_at();

create table if not exists public.tracked_groups (
  id uuid primary key default gen_random_uuid(),
  group_id text not null unique,
  group_name text,
  member_count integer,
  tracked boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tracked_groups_set_updated_at on public.tracked_groups;
create trigger tracked_groups_set_updated_at
  before insert or update on public.tracked_groups
  for each row execute function public.set_updated_at();

alter table public.listings enable row level security;
alter table public.tracked_groups enable row level security;

drop policy if exists "Public read active listings" on public.listings;
create policy "Public read active listings"
  on public.listings for select
  using (true);

drop policy if exists "Public write listings" on public.listings;
create policy "Public write listings"
  on public.listings for all
  using (true)
  with check (true);

drop policy if exists "Public access tracked_groups" on public.tracked_groups;
create policy "Public access tracked_groups"
  on public.tracked_groups for all
  using (true)
  with check (true);

grant all on table public.listings, public.tracked_groups to anon, authenticated, service_role;

create or replace function public.delete_expired_listings()
returns void
language sql
as $$
  delete from public.listings where posted_at < now() - interval '60 days';
$$;

notify pgrst, 'reload schema';
