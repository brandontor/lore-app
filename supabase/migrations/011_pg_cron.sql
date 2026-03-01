-- Enable required extensions (pg_net for HTTP calls, pg_cron for scheduling)
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the fallback video poll every minute.
-- To update: SELECT cron.unschedule('poll-pending-videos'); then re-run below.
SELECT cron.schedule(
  'poll-pending-videos',
  '* * * * *',
  $$
    SELECT net.http_get(
      url := 'https://www.lore-forge.io/api/cron/video-poll',
      headers := jsonb_build_object('x-cron-secret', '0efb7ae739fdbc424beee3feb7e167c2010e17a6fae15335332c204862778ea8')
    )
  $$
);
