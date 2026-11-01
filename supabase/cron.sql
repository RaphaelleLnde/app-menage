-- Lecture automatique du calendrier Airbnb toutes les 30 minutes.
-- À exécuter APRÈS la mise en ligne sur Vercel, dans Supabase > SQL Editor.
-- Remplace les deux valeurs entre < > avant de cliquer sur "Run".

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'synchro-calendrier-airbnb',
  '*/30 * * * *',
  $$
  select net.http_get(
    url := 'https://<ADRESSE-DE-TON-APP>.vercel.app/api/cron/sync',
    headers := jsonb_build_object('Authorization', 'Bearer <TON-CRON_SECRET>')
  );
  $$
);

-- Pour arrêter plus tard : select cron.unschedule('synchro-calendrier-airbnb');
