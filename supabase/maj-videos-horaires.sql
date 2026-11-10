-- Mise à jour : vidéos, horaires (départ tardif / arrivée anticipée), remarques de l'hôte, notifications conciergerie.
-- À coller dans Supabase > SQL Editor > New query, puis Run (une seule fois), AVANT de mettre le nouveau code sur GitHub.

-- Vidéos rangées avec les photos
alter table photos add column if not exists kind text not null default 'photo';   -- 'photo' ou 'video'
alter table photos add column if not exists content_type text;
alter table photos alter column sha256 drop not null;                              -- pas d'empreinte pour les vidéos

-- Horaires particuliers et remarques privées sur la réservation
alter table cleanings add column if not exists checkin_time text;    -- arrivée anticipée, ex. 13:00
alter table cleanings add column if not exists checkout_time text;   -- départ tardif, ex. 13:00
alter table cleanings add column if not exists host_memo text;       -- remarques de l'hôte (non visibles par la conciergerie)

-- Qui reçoit les notifications : l'hôte ou la conciergerie
alter table push_subscriptions add column if not exists role text not null default 'host';

-- Taille maximale d'un fichier : 50 Mo (vidéos)
update storage.buckets set file_size_limit = 52428800 where id = 'photos';
