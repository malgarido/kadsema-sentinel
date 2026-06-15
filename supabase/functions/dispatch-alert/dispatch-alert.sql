-- ============================================================
-- KADSEMA SENTINEL — Alert dispatch wiring
-- Run AFTER schema.sql + seed.sql. Adds delivery-receipt tables
-- and a trigger that invokes the dispatch-alert Edge Function
-- whenever a new alert is inserted.
-- ============================================================

-- delivery receipts (one row per channel per alert)
create table if not exists alert_delivery (
  id        uuid primary key default uuid_generate_v4(),
  alert_id  uuid references alert (id) on delete cascade,
  provider  text not null,            -- SMS | WhatsApp | Siren | Radio
  status    text not null,            -- sent | error | skipped | queued | activated
  detail    text,
  created_at timestamptz not null default now()
);
create index if not exists alert_delivery_idx on alert_delivery (alert_id);

-- human broadcast queue (radio/TV is a person-in-the-loop step)
create table if not exists broadcast_queue (
  id        uuid primary key default uuid_generate_v4(),
  alert_id  uuid references alert (id) on delete cascade,
  scope     text,
  message   text,
  language  text,
  priority  text not null default 'Routine',   -- Urgent | Routine
  status    text not null default 'Queued',     -- Queued | On Air | Aired
  operator  text,
  handled   boolean not null default false,
  created_at timestamptz not null default now()
);
alter table broadcast_queue enable row level security;
create policy bq_read   on broadcast_queue for select using (auth.uid() is not null);
-- only zonal+ (broadcast desk operators) may change status
create policy bq_update on broadcast_queue for update using (sentinel_role() in ('hq','zonal'));
create policy bq_insert on broadcast_queue for insert with check (true);

-- ------------------------------------------------------------
-- Invoke the Edge Function on new alerts.
-- Requires the pg_net extension (available on Supabase).
-- Replace <PROJECT_REF> and the service-role key reference.
-- ------------------------------------------------------------
create extension if not exists pg_net;

create or replace function notify_dispatch_alert() returns trigger
language plpgsql security definer as $$
begin
  perform net.http_post(
    url     := 'https://bfqwdvbcsnrvczulvriw.functions.supabase.co/dispatch-alert',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
               ),
    body    := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end $$;

drop trigger if exists trg_dispatch_alert on alert;
create trigger trg_dispatch_alert
  after insert on alert
  for each row execute function notify_dispatch_alert();

-- Set the service-role key once (Supabase: Settings → Database → Custom config),
-- or prefer Supabase Database Webhooks (Dashboard → Database → Webhooks) which
-- handle auth for you — in that case you do NOT need this trigger.
--   alter database postgres set app.service_role_key = '<SERVICE_ROLE_KEY>';
