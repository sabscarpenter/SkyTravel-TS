CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'cleanup_sessioni',
  '0 22 * * *',
  $$
    DELETE FROM sessioni
    WHERE scadenza < NOW() OR revocato = TRUE;
  $$
);

SELECT cron.unschedule('cleanup_sessioni');

SELECT
  jobid,
  jobname,
  schedule,
  command,
  database,
  username,
  active
FROM cron.job;