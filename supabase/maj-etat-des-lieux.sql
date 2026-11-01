-- Mise à jour : état des lieux d'arrivée et tâches facultatives.
-- À coller dans Supabase > SQL Editor > New query, puis Run (une seule fois).

alter table checklist_items add column if not exists required boolean not null default true;
alter table cleaning_checks add column if not exists required boolean not null default true;

alter table cleanings add column if not exists arrival_state text;        -- propre, ras, sale, tres_sale
alter table cleanings add column if not exists arrival_note text;
alter table cleanings add column if not exists arrival_done_at timestamptz;

alter table photos add column if not exists phase text not null default 'menage';  -- 'arrivee' ou 'menage'
alter table photos add column if not exists area text;                            -- salon, cuisine, sdb, chambre

-- Les tâches évidentes de départ deviennent facultatives (elles restent cochables)
update checklist_items set required = false
where label in ('Aérer le logement pendant le ménage', 'Fenêtres fermées, chauffage ou clim en mode éco', 'Lumières éteintes, porte fermée à clé');
