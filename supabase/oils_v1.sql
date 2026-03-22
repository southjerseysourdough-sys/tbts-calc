create extension if not exists pgcrypto;

create table if not exists public.oils (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  category text not null,
  naoh_sap numeric(8, 6) not null,
  koh_sap numeric(8, 6) not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint oils_slug_key unique (slug),
  constraint oils_name_not_blank check (btrim(name) <> ''),
  constraint oils_category_not_blank check (btrim(category) <> ''),
  constraint oils_naoh_sap_positive check (naoh_sap > 0),
  constraint oils_koh_sap_positive check (koh_sap > 0)
);

create index if not exists oils_active_sort_name_idx
  on public.oils (is_active, sort_order, name);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists oils_set_updated_at on public.oils;

create trigger oils_set_updated_at
before update on public.oils
for each row
execute function public.set_updated_at();

alter table public.oils enable row level security;

drop policy if exists "Public can read active oils" on public.oils;

create policy "Public can read active oils"
on public.oils
for select
to anon, authenticated
using (is_active = true);

insert into public.oils (
  slug,
  name,
  category,
  naoh_sap,
  koh_sap,
  is_active,
  sort_order,
  notes
)
values
  ('tallow', 'Tallow', 'animal-fat', 0.141000, 0.198000, true, 10, 'General rendered tallow profile for cold process soap.'),
  ('olive-oil', 'Olive Oil', 'liquid-oil', 0.134000, 0.188000, true, 20, 'Classic olive oil profile.'),
  ('coconut-oil-76', 'Coconut Oil 76', 'hard-oil', 0.183000, 0.257000, true, 30, '76 degree coconut oil.'),
  ('shea-butter', 'Shea Butter', 'butter', 0.128000, 0.180000, true, 40, 'Refined shea butter profile.'),
  ('castor-oil', 'Castor Oil', 'liquid-oil', 0.128000, 0.179000, true, 50, 'Standard castor oil profile.'),
  ('avocado-oil', 'Avocado Oil', 'liquid-oil', 0.133000, 0.187000, true, 60, 'Avocado oil profile.'),
  ('cocoa-butter', 'Cocoa Butter', 'butter', 0.137000, 0.193000, true, 70, 'Natural cocoa butter profile.'),
  ('mango-butter', 'Mango Butter', 'butter', 0.137000, 0.192000, true, 80, 'Mango butter profile.'),
  ('sweet-almond-oil', 'Sweet Almond Oil', 'liquid-oil', 0.136000, 0.191000, true, 90, 'Sweet almond oil profile.'),
  ('sunflower-oil', 'Sunflower Oil', 'liquid-oil', 0.135000, 0.189000, true, 100, 'Conventional sunflower oil profile.'),
  ('rice-bran-oil', 'Rice Bran Oil', 'liquid-oil', 0.128000, 0.179000, true, 110, 'Rice bran oil profile.'),
  ('lard', 'Lard', 'animal-fat', 0.138000, 0.194000, true, 120, 'Standard lard profile.'),
  ('babassu-oil', 'Babassu Oil', 'hard-oil', 0.175000, 0.246000, true, 130, 'Babassu oil profile.'),
  ('kokum-butter', 'Kokum Butter', 'butter', 0.138000, 0.194000, true, 140, 'Kokum butter profile.'),
  ('apricot-kernel-oil', 'Apricot Kernel Oil', 'liquid-oil', 0.135000, 0.190000, true, 150, 'Apricot kernel oil profile.')
on conflict (slug) do update
set
  name = excluded.name,
  category = excluded.category,
  naoh_sap = excluded.naoh_sap,
  koh_sap = excluded.koh_sap,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  notes = excluded.notes,
  updated_at = now();
