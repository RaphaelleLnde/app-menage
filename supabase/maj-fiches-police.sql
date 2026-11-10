-- Mise à jour : fiches de police des voyageurs.
-- À coller dans Supabase > SQL Editor > New query, puis Run (une seule fois).

create table if not exists guest_forms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  arrival date not null,
  departure date not null,
  lead_name text not null,           -- nom de la personne qui a réservé
  lead_phone text,                   -- son téléphone
  all_french boolean not null default false,
  lang text,
  travellers jsonb not null default '[]'::jsonb,   -- une fiche par voyageur étranger
  children jsonb not null default '[]'::jsonb,     -- enfants de moins de 15 ans
  signatures jsonb not null default '[]'::jsonb    -- signatures (images), dans l'ordre des voyageurs
);
create index if not exists guest_forms_arrival_idx on guest_forms (arrival);
-- Données personnelles : aucune lecture possible depuis l'extérieur, seule l'application y accède
alter table guest_forms enable row level security;

-- (si la table existait déjà)
alter table guest_forms add column if not exists lead_phone text;
-- Téléphone du voyageur recopié sur la réservation
alter table cleanings add column if not exists guest_phone text;
