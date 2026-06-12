-- ============================================================
-- KADSEMA SENTINEL — Seed data
-- Run AFTER schema.sql. Replace geom/centroid with real
-- coordinates once a Kaduna LGA GeoJSON is loaded (see README).
-- ============================================================

-- ---------- Local Government Areas (23) ----------
insert into lga (name, zone, population, wards, hazard, exposure, vulnerability, risk, dominant_hazard) values
  ('Giwa', 'North', 286, 11, 0.45, 0.4, 0.5, 0.41, 'Flood'),
  ('Makarfi', 'North', 154, 9, 0.3, 0.35, 0.42, 0.32, 'Epidemic'),
  ('Ikara', 'North', 198, 10, 0.34, 0.38, 0.46, 0.36, 'Flood'),
  ('Birnin Gwari', 'West', 312, 11, 0.95, 0.6, 0.88, 0.93, 'Conflict'),
  ('Sabon Gari', 'North', 401, 11, 0.5, 0.74, 0.55, 0.58, 'Fire'),
  ('Zaria', 'North', 698, 13, 0.6, 0.86, 0.7, 0.74, 'Urban Flood'),
  ('Kudan', 'North', 142, 8, 0.28, 0.34, 0.4, 0.3, 'Epidemic'),
  ('Igabi', 'Central', 575, 12, 0.82, 0.78, 0.84, 0.9, 'Flood + Displacement'),
  ('Kaduna North', 'Central', 487, 12, 0.66, 0.92, 0.62, 0.78, 'Urban Flood / Fire'),
  ('Kaduna South', 'Central', 503, 13, 0.6, 0.9, 0.64, 0.71, 'Urban Flood / Fire'),
  ('Soba', 'North', 295, 12, 0.42, 0.36, 0.48, 0.4, 'Flood'),
  ('Kubau', 'East', 322, 11, 0.5, 0.38, 0.52, 0.46, 'Flood'),
  ('Chikun', 'Central', 612, 12, 0.46, 0.6, 0.55, 0.52, 'Fire / RTA'),
  ('Kajuru', 'Central', 132, 10, 0.7, 0.46, 0.66, 0.64, 'Conflict'),
  ('Kachia', 'South', 252, 10, 0.5, 0.42, 0.56, 0.49, 'Conflict'),
  ('Kauru', 'East', 174, 11, 0.88, 0.5, 0.8, 0.82, 'Displacement'),
  ('Lere', 'East', 367, 13, 0.66, 0.46, 0.62, 0.61, 'Conflict / Flood'),
  ('Kagarko', 'South', 245, 10, 0.46, 0.4, 0.5, 0.43, 'Flood'),
  ('Jaba', 'South', 168, 9, 0.3, 0.32, 0.42, 0.31, 'RTA'),
  ('Zangon Kataf', 'South', 364, 11, 0.64, 0.5, 0.6, 0.6, 'Conflict'),
  ('Jema''a', 'South', 287, 11, 0.36, 0.4, 0.46, 0.38, 'Flood'),
  ('Sanga', 'South', 152, 8, 0.32, 0.34, 0.44, 0.34, 'Flood'),
  ('Kaura', 'South', 215, 9, 0.5, 0.4, 0.54, 0.47, 'Conflict')
on conflict (name) do nothing;

-- ---------- Monitoring gauges ----------
insert into gauge (name, kind, unit, value, warn, danger, max, lga_id) values
  ('River Kaduna — Kaduna Bridge', 'river', 'm', 8.4, 7.5, 8, 10, (select id from lga where name='Kaduna North')),
  ('River Gurara — Kagarko', 'river', 'm', 5.9, 6, 6.8, 8, (select id from lga where name='Kagarko')),
  ('Rainfall — Igabi AWS', 'rain', 'mm/72h', 168, 120, 150, 220, (select id from lga where name='Igabi')),
  ('Rainfall — Zaria AWS', 'rain', 'mm/72h', 96, 120, 150, 220, (select id from lga where name='Zaria')),
  ('River Kaduna — Kasuwan Magani', 'river', 'm', 6.7, 7, 7.8, 9, (select id from lga where name='Kajuru'));

-- ---------- Warning triggers ----------
insert into trigger (rule, lga_id, level, action, fired_at, live) values
  ('Rainfall > 150mm / 72h', (select id from lga where name='Igabi'), 3, 'Flood watch → pre-position relief', now() - interval '46 minutes', true),
  ('River level ≥ danger mark (8.0m)', (select id from lga where name='Kaduna North'), 3, 'Evacuation advisory issued', now() - interval '28 minutes', true),
  ('Displacement spike (security feed)', (select id from lga where name='Birnin Gwari'), 3, 'IDP camp protocol activated', now() - interval '70 minutes', true),
  ('Disease cluster ≥ 5 cases / 24h', (select id from lga where name='Zaria'), 2, 'Epidemic surveillance escalation', now() - interval '92 minutes', true),
  ('River level ≥ warning mark (6.0m)', (select id from lga where name='Kagarko'), 1, 'Monitoring intensified', now() - interval '15 minutes', true);

-- ---------- Resources ----------
insert into resource (name, have, capacity, unit) values
  ('Relief food packs', 4200, 6000, 'packs'),
  ('Tarpaulin / shelter kits', 880, 2000, 'kits'),
  ('Water purification', 15400, 20000, 'sachets'),
  ('Rescue boats', 9, 14, 'units'),
  ('Response vehicles', 21, 28, 'units'),
  ('Medical / first-aid kits', 540, 800, 'kits');

-- ---------- Response teams ----------
insert into team (name, base, status, lga_id, members) values
  ('Central Zonal Response', 'Kaduna HQ', 'Deployed', (select id from lga where name='Igabi'), 12),
  ('West IDP Task Force', 'Birnin Gwari', 'Deployed', (select id from lga where name='Birnin Gwari'), 9),
  ('Fire Service — Kawo', 'Kaduna North', 'Deployed', (select id from lga where name='Kaduna North'), 6),
  ('East Rapid Assessment', 'Saminaka', 'Standby', (select id from lga where name='Lere'), 7),
  ('Health Surveillance Unit', 'Zaria', 'Active', (select id from lga where name='Zaria'), 5);

-- ---------- Seed incidents ----------
insert into incident (id, type, icon, severity, status, lga_id, ward, channel, reporter_name, description, sla, created_at) values
  ('INC-2057', 'Flood', 'flood', 3, 'Responding', (select id from lga where name='Igabi'), 'Rigachikun', 'App', 'Field Officer', 'River Kaduna overtopped banks at Rigachikun. ~140 households affected.', 'watch', now() - interval '38 minutes'),
  ('INC-2058', 'Conflict', 'conflict', 3, 'Responding', (select id from lga where name='Birnin Gwari'), 'Kuyello', 'Call', 'Field Officer', 'Displacement influx following security incident. 600+ persons moving toward town.', 'watch', now() - interval '64 minutes'),
  ('INC-2059', 'Fire', 'fire', 2, 'Responding', (select id from lga where name='Kaduna North'), 'Kawo', 'SMS', 'Field Officer', 'Market fire outbreak, Kawo. 4 lockup shops affected.', 'watch', now() - interval '19 minutes'),
  ('INC-2060', 'Epidemic', 'health', 2, 'Verified', (select id from lga where name='Zaria'), 'Tudun Wada', 'App', 'Field Officer', 'Cluster of acute watery diarrhoea cases (cholera suspected).', 'watch', now() - interval '95 minutes'),
  ('INC-2061', 'Building Collapse', 'collapse', 2, 'Reported', (select id from lga where name='Kaduna North'), 'Doka', 'Call', 'Field Officer', 'Two-storey building partial collapse. Unconfirmed persons trapped.', 'watch', now() - interval '8 minutes');
