-- Schéma de la base. À coller tel quel dans Supabase > SQL Editor > New query, puis "Run".

create table if not exists app_state (
  key text primary key,
  value jsonb
);

create table if not exists checklist_items (
  id bigint generated always as identity primary key,
  room text not null,
  label text not null,
  photo_required boolean not null default false,
  position int not null default 0
);

create table if not exists cleanings (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity,
  date date not null,
  source text not null default 'manual',          -- 'ical' ou 'manual'
  ical_uid text unique,
  checkin_date date,
  next_checkin date,
  status text not null default 'planned',          -- planned, in_progress, done, cancelled
  cleaner_name text,
  completed_by text,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  host_note text,                                  -- consigne de l'hôte pour ce ménage
  extra_tasks jsonb not null default '[]'::jsonb,  -- points ajoutés à la checklist pour ce ménage
  created_at timestamptz not null default now()
);
-- (si la table existait déjà avant l'ajout des consignes)
alter table cleanings add column if not exists host_note text;
alter table cleanings add column if not exists extra_tasks jsonb not null default '[]'::jsonb;
-- Infos sur la réservation liée (le nom du voyageur est saisi par l'hôte : les calendriers ne le donnent pas)
alter table cleanings add column if not exists guest_name text;
alter table cleanings add column if not exists resa_code text;
alter table cleanings add column if not exists guest_phone4 text;
alter table cleanings add column if not exists resa_gone boolean not null default false;  -- réservation disparue du calendrier
-- Remarques du personnel (commentaire ou photo de problème) et suivi par l'hôte
alter table cleanings add column if not exists has_remarks boolean not null default false;
alter table cleanings add column if not exists remarks_seen boolean not null default false;
create index if not exists cleanings_date_idx on cleanings (date);

-- Copie de la checklist figée au début de chaque ménage
create table if not exists cleaning_checks (
  id bigint generated always as identity primary key,
  cleaning_id uuid not null references cleanings(id) on delete cascade,
  room text not null,
  label text not null,
  photo_required boolean not null default false,
  position int not null default 0,
  checked boolean not null default false,
  checked_at timestamptz
);
create index if not exists cleaning_checks_cleaning_idx on cleaning_checks (cleaning_id);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  cleaning_id uuid not null references cleanings(id) on delete cascade,
  check_id bigint references cleaning_checks(id) on delete set null,
  storage_path text not null,
  sha256 text not null,
  size_bytes int,
  uploaded_by text,
  client_time timestamptz,
  received_at timestamptz not null default now()   -- heure du serveur, pas du téléphone
);
create index if not exists photos_cleaning_idx on photos (cleaning_id);

create table if not exists push_subscriptions (
  endpoint text primary key,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

-- Sécurité : aucune lecture ni écriture possible depuis l'extérieur.
-- Seule l'application (clé service_role, gardée sur Vercel) accède aux données.
alter table app_state enable row level security;
alter table checklist_items enable row level security;
alter table cleanings enable row level security;
alter table cleaning_checks enable row level security;
alter table photos enable row level security;
alter table push_subscriptions enable row level security;

-- Stockage privé des photos
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;
