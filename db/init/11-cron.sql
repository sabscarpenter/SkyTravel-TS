CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'cleanup_sessioni',
  '0 22 * * *',
  $$
    DELETE FROM sessioni
    WHERE scadenza < NOW() OR revocato = TRUE;
  $$
);

select cron.schedule(
  'cleanup_postiscaduti',
  '*/5 * * * *',
 $$ 
  delete from biglietti
  where scadenza < now(); 
 $$
);