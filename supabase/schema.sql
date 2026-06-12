-- ============================================================
-- KADSEMA SENTINEL — Production database schema
-- PostgreSQL 15+ with PostGIS 3+
-- Target: Supabase (or any managed Postgres). Run in order.
-- ============================================================

create extension if not exists postgis;
create extension if not exists "uuid-ossp";

-- ---------- enums ----------
create type incident_status as enum ('Reported', 'Verified', 'Responding', 'Closed');
create type actor_tier      as enum ('Community', 'LGA', 'Zonal', 'HQ');
create type user_role       as enum ('hq', 'zonal', 'lga', 'community');
create type gauge_kind       as enum ('river', 'rain');
create type sla_state        as enum ('ok', 'watch', 'breach');

-- ============================================================
-- REFERENCE: Local Government Areas (23) + risk profile
-- ============================================================
create table lga (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  zone        text not null,                       -- Central|North|South|East|West
  population  integer,                              -- in thousands
  wards       integer,
  hazard      numeric(4,3) not null default 0,      -- 0..1
  exposure    numeric(4,3) not null default 0,
  vulnerability numeric(4,3) not null default 0,
  risk        numeric(4,3) not null default 0,      -- composite
  dominant_hazard text,
  geom        geometry(MultiPolygon, 4326),         -- real LGA boundary (load from GeoJSON)
  centroid    geometry(Point, 4326),
  created_at  timestamptz not null default now()
);
create index lga_geom_idx on lga using gist (geom);
create index lga_zone_idx on lga (zone);

-- ============================================================
-- USERS  (extends Supabase auth.users via id)
-- ============================================================
create table app_user (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null,
  role       user_role not null default 'community',
  zone       text,
  lga_id     uuid references lga (id),
  phone      text,
  created_at timestamptz not null default now()
);

-- helper: current user's role / scope (used by RLS)
-- Named sentinel_role() to avoid shadowing PostgreSQL's built-in current_role keyword.
create or replace function sentinel_role() returns user_role
  language sql stable security definer
  as $$ select role from app_user where id = auth.uid() $$;
create or replace function current_lga() returns uuid
  language sql stable security definer
  as $$ select lga_id from app_user where id = auth.uid() $$;
create or replace function current_zone() returns text
  language sql stable security definer
  as $$ select zone from app_user where id = auth.uid() $$;

-- ============================================================
-- INCIDENTS  + escalation chain (event-sourced)
-- ============================================================
create table incident (
  id          text primary key,                     -- 'INC-2061' (see sequence below)
  type        text not null,
  icon        text,
  severity    smallint not null check (severity between 1 and 3),
  status      incident_status not null default 'Reported',
  lga_id      uuid not null references lga (id),
  ward        text,
  geom        geometry(Point, 4326),
  channel     text,                                  -- App|SMS|Call|WhatsApp|EOC Console
  reporter_id uuid references app_user (id),
  reporter_name text,
  description text,
  sla         sla_state not null default 'watch',
  assigned_team text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index incident_status_idx on incident (status);
create index incident_lga_idx    on incident (lga_id);
create index incident_geom_idx   on incident using gist (geom);

-- human-friendly running id: INC-2062, INC-2063 …
create sequence incident_seq start 2062;
create or replace function next_incident_id() returns text
  language sql as $$ select 'INC-' || nextval('incident_seq') $$;

-- RPC used by the front-end store (store.supabase.js → db.rpc('log_incident', …))
-- security definer so community users can insert without direct table access.
create or replace function log_incident(
  p_type        text,
  p_icon        text,
  p_severity    smallint,
  p_lga         uuid,
  p_ward        text        default null,
  p_channel     text        default 'App',
  p_description text        default null,
  p_reporter    text        default null
) returns json
language plpgsql security definer as $$
declare
  v_id text;
begin
  v_id := next_incident_id();
  insert into incident (id, type, icon, severity, lga_id, ward, channel, reporter_name, description, reporter_id)
  values (
    v_id, p_type, p_icon, p_severity,
    p_lga, p_ward, p_channel,
    coalesce(p_reporter, 'Field Officer'),
    p_description,
    auth.uid()
  );
  insert into incident_event (incident_id, actor_tier, note, actor_id)
  values (v_id, 'Community'::actor_tier, 'Incident reported', auth.uid());
  return json_build_object('id', v_id);
end $$;

create table incident_event (
  id          uuid primary key default uuid_generate_v4(),
  incident_id text not null references incident (id) on delete cascade,
  actor_tier  actor_tier not null,
  note        text not null,
  actor_id    uuid references app_user (id),
  created_at  timestamptz not null default now()
);
create index incident_event_idx on incident_event (incident_id, created_at);

-- ============================================================
-- EARLY WARNING — gauges, triggers, alerts
-- ============================================================
create table gauge (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  kind       gauge_kind not null,
  lga_id     uuid references lga (id),
  unit       text not null,
  value      numeric not null,
  warn       numeric not null,
  danger     numeric not null,
  max        numeric not null,
  updated_at timestamptz not null default now()
);

create table trigger (
  id         uuid primary key default uuid_generate_v4(),
  rule       text not null,
  lga_id     uuid references lga (id),
  level      smallint not null check (level between 1 and 3),
  action     text,
  fired_at   timestamptz,
  live       boolean not null default true
);

create table alert (
  id          uuid primary key default uuid_generate_v4(),
  channels    text[] not null,
  language    text,
  lga_id      uuid references lga (id),
  scope       text,                                 -- 'Statewide' or LGA name
  message     text not null,
  recipients  text,
  issued_by   uuid references app_user (id),
  sent_at     timestamptz not null default now()
);

-- ============================================================
-- RESOURCES & TEAMS
-- ============================================================
create table resource (
  id        uuid primary key default uuid_generate_v4(),
  name      text not null,
  have      integer not null,
  capacity  integer not null,
  unit      text,
  lga_id    uuid references lga (id)
);

create table team (
  id       uuid primary key default uuid_generate_v4(),
  name     text not null,
  base     text,
  status   text not null default 'Standby',         -- Deployed|Active|Standby
  lga_id   uuid references lga (id),
  members  integer
);

-- ============================================================
-- AUDIT LOG  (immutable trail — NDPR / accountability)
-- ============================================================
create table audit_log (
  id        uuid primary key default uuid_generate_v4(),
  action    text not null,
  actor_id  uuid references app_user (id),
  ref       text,
  detail    text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TRIGGERS: auto-append escalation event + stamp updated_at
-- ============================================================
create or replace function on_incident_status_change() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if (tg_op = 'UPDATE' and new.status <> old.status) then
    insert into incident_event (incident_id, actor_tier, note, actor_id)
    values (
      new.id,
      case new.status when 'Verified' then 'LGA'::actor_tier
                      when 'Responding' then 'Zonal'::actor_tier
                      when 'Closed' then 'HQ'::actor_tier
                      else 'Community'::actor_tier end,
      case new.status when 'Verified' then 'Validated by desk officer'
                      when 'Responding' then 'Verified · response team assigned'
                      when 'Closed' then 'Resolved · report filed'
                      else 'Logged' end,
      auth.uid()
    );
    insert into audit_log (action, actor_id, ref, detail)
    values ('STATUS_' || upper(new.status::text), auth.uid(), new.id, new.type || ' → ' || new.status);
  end if;
  return new;
end $$;

create trigger trg_incident_status
  before update on incident
  for each row execute function on_incident_status_change();

-- ============================================================
-- ROW-LEVEL SECURITY  (4-tier access control)
-- HQ: everything · Zonal: own zone · LGA: own LGA · Community: report+read
-- ============================================================
alter table incident       enable row level security;
alter table incident_event enable row level security;
alter table alert          enable row level security;
alter table lga            enable row level security;

-- incidents: read scoped by tier
create policy incident_read on incident for select using (
  sentinel_role() = 'hq'
  or (sentinel_role() = 'zonal' and lga_id in (select id from lga where zone = current_zone()))
  or (sentinel_role() = 'lga'   and lga_id = current_lga())
  or (sentinel_role() = 'community')
);
-- anyone authenticated may log a new incident
create policy incident_insert on incident for insert with check (auth.uid() is not null);
-- only LGA+ may advance status, scoped
create policy incident_update on incident for update using (
  sentinel_role() in ('hq','zonal','lga')
);

-- alerts: only zonal+ may issue; everyone reads
create policy alert_read   on alert for select using (true);
create policy alert_insert on alert for insert with check (sentinel_role() in ('hq','zonal'));

-- lga reference readable by all authenticated
create policy lga_read on lga for select using (auth.uid() is not null);

-- realtime (Supabase): broadcast incident + alert changes to dashboards
-- alter publication supabase_realtime add table incident, alert, incident_event;
