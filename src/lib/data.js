/* ============================================================
   KADSEMA SENTINEL — Data layer & stylized map geometry
   Exposes window.KAD = { ...datasets, helpers }
   ============================================================ */
(function () {
  "use strict";

  /* ---------- deterministic PRNG ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- color helpers ---------- */
  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    const r = Math.round(A[0] + (B[0] - A[0]) * t);
    const g = Math.round(A[1] + (B[1] - A[1]) * t);
    const bl = Math.round(A[2] + (B[2] - A[2]) * t);
    return `rgb(${r},${g},${bl})`;
  }
  // sequential risk ramp green -> gold -> orange -> red -> deep red
  const RAMP = [
    [0.0, "#2f8f4e"],
    [0.38, "#b89a32"],
    [0.58, "#d98a2b"],
    [0.78, "#d75a39"],
    [1.0, "#bb2f33"],
  ];
  function riskColor(v) {
    v = Math.max(0, Math.min(1, v));
    for (let i = 1; i < RAMP.length; i++) {
      if (v <= RAMP[i][0]) {
        const lo = RAMP[i - 1], hi = RAMP[i];
        const t = (v - lo[0]) / (hi[0] - lo[0]);
        return mix(lo[1], hi[1], t);
      }
    }
    return RAMP[RAMP.length - 1][1];
  }
  function riskBand(v) {
    if (v < 0.34) return "Low";
    if (v < 0.54) return "Moderate";
    if (v < 0.72) return "High";
    if (v < 0.87) return "Severe";
    return "Extreme";
  }

  /* ============================================================
     STYLIZED KADUNA STATE MAP
     Non-uniform jittered grid -> single-cell LGAs (gap-free).
     ============================================================ */
  const VB_W = 1000, VB_H = 1240;
  const COLS = 5, ROWS = 6;
  // non-uniform column widths / row heights (sum to 1)
  const colW = [0.18, 0.21, 0.215, 0.205, 0.19];
  const rowH = [0.135, 0.16, 0.19, 0.185, 0.165, 0.165];
  const padX = 64, padY = 64;
  const innerW = VB_W - padX * 2, innerH = VB_H - padY * 2;

  const colX = [padX];
  for (let c = 0; c < COLS; c++) colX.push(colX[c] + colW[c] * innerW);
  const rowY = [padY];
  for (let r = 0; r < ROWS; r++) rowY.push(rowY[r] + rowH[r] * innerH);

  const rnd = mulberry32(11);
  const P = []; // P[r][c]
  for (let r = 0; r <= ROWS; r++) {
    P[r] = [];
    for (let c = 0; c <= COLS; c++) {
      const edge = c === 0 || c === COLS || r === 0 || r === ROWS;
      const j = edge ? 12 : 26;
      P[r][c] = {
        x: colX[c] + (rnd() * 2 - 1) * j,
        y: rowY[r] + (rnd() * 2 - 1) * j,
      };
    }
  }
  function cellPath(c, r) {
    const a = P[r][c], b = P[r][c + 1], d = P[r + 1][c + 1], e = P[r + 1][c];
    return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)} L${d.x.toFixed(1)} ${d.y.toFixed(1)} L${e.x.toFixed(1)} ${e.y.toFixed(1)} Z`;
  }
  function cellCenter(c, r) {
    const a = P[r][c], b = P[r][c + 1], d = P[r + 1][c + 1], e = P[r + 1][c];
    return { x: (a.x + b.x + d.x + e.x) / 4, y: (a.y + b.y + d.y + e.y) / 4 };
  }

  // LGA definitions: cell [c,r], composite risk, sub-scores, pop(000s), wards, dominant hazard, zone
  const LGA_DEF = [
    // row 0 (far north)
    ["Giwa", 1, 0, 0.41, { h: 0.45, e: 0.4, v: 0.5 }, 286, 11, "Flood", "North"],
    ["Makarfi", 2, 0, 0.32, { h: 0.3, e: 0.35, v: 0.42 }, 154, 9, "Epidemic", "North"],
    ["Ikara", 3, 0, 0.36, { h: 0.34, e: 0.38, v: 0.46 }, 198, 10, "Flood", "North"],
    // row 1
    ["Birnin Gwari", 0, 1, 0.93, { h: 0.95, e: 0.6, v: 0.88 }, 312, 11, "Conflict", "West"],
    ["Sabon Gari", 1, 1, 0.58, { h: 0.5, e: 0.74, v: 0.55 }, 401, 11, "Fire", "North"],
    ["Zaria", 2, 1, 0.74, { h: 0.6, e: 0.86, v: 0.7 }, 698, 13, "Urban Flood", "North"],
    ["Kudan", 3, 1, 0.3, { h: 0.28, e: 0.34, v: 0.4 }, 142, 8, "Epidemic", "North"],
    // row 2 (central)
    ["Igabi", 0, 2, 0.9, { h: 0.82, e: 0.78, v: 0.84 }, 575, 12, "Flood + Displacement", "Central"],
    ["Kaduna North", 1, 2, 0.78, { h: 0.66, e: 0.92, v: 0.62 }, 487, 12, "Urban Flood / Fire", "Central"],
    ["Kaduna South", 2, 2, 0.71, { h: 0.6, e: 0.9, v: 0.64 }, 503, 13, "Urban Flood / Fire", "Central"],
    ["Soba", 3, 2, 0.4, { h: 0.42, e: 0.36, v: 0.48 }, 295, 12, "Flood", "North"],
    ["Kubau", 4, 2, 0.46, { h: 0.5, e: 0.38, v: 0.52 }, 322, 11, "Flood", "East"],
    // row 3
    ["Chikun", 0, 3, 0.52, { h: 0.46, e: 0.6, v: 0.55 }, 612, 12, "Fire / RTA", "Central"],
    ["Kajuru", 1, 3, 0.64, { h: 0.7, e: 0.46, v: 0.66 }, 132, 10, "Conflict", "Central"],
    ["Kachia", 2, 3, 0.49, { h: 0.5, e: 0.42, v: 0.56 }, 252, 10, "Conflict", "South"],
    ["Kauru", 3, 3, 0.82, { h: 0.88, e: 0.5, v: 0.8 }, 174, 11, "Displacement", "East"],
    ["Lere", 4, 3, 0.61, { h: 0.66, e: 0.46, v: 0.62 }, 367, 13, "Conflict / Flood", "East"],
    // row 4
    ["Kagarko", 1, 4, 0.43, { h: 0.46, e: 0.4, v: 0.5 }, 245, 10, "Flood", "South"],
    ["Jaba", 2, 4, 0.31, { h: 0.3, e: 0.32, v: 0.42 }, 168, 9, "RTA", "South"],
    ["Zangon Kataf", 3, 4, 0.6, { h: 0.64, e: 0.5, v: 0.6 }, 364, 11, "Conflict", "South"],
    // row 5 (far south)
    ["Jema'a", 1, 5, 0.38, { h: 0.36, e: 0.4, v: 0.46 }, 287, 11, "Flood", "South"],
    ["Sanga", 2, 5, 0.34, { h: 0.32, e: 0.34, v: 0.44 }, 152, 8, "Flood", "South"],
    ["Kaura", 3, 5, 0.47, { h: 0.5, e: 0.4, v: 0.54 }, 215, 9, "Conflict", "South"],
  ];

  const LGAS = LGA_DEF.map((d, i) => {
    const [name, c, r, risk, sub, pop, wards, hazard, zone] = d;
    return {
      id: "lga-" + i,
      name, col: c, row: r, risk, hazard, zone,
      hazardScore: sub.h, exposureScore: sub.e, vulnScore: sub.v,
      pop, wards,
      path: cellPath(c, r),
      center: cellCenter(c, r),
      band: riskBand(risk),
      color: riskColor(risk),
    };
  });
  const lgaByName = {};
  LGAS.forEach((l) => (lgaByName[l.name] = l));

  // rivers as simple polylines (Kaduna + Gurara), drawn through grid space
  function pt(c, r) { const p = cellCenter(Math.min(c, COLS - 1), Math.min(r, ROWS - 1)); return p; }
  const RIVERS = [
    {
      name: "River Kaduna",
      d: `M ${P[1][0].x} ${P[1][0].y} C ${pt(1, 1).x} ${pt(1, 1).y}, ${pt(1, 2).x} ${pt(1, 2).y}, ${pt(2, 2).x} ${pt(2, 2).y} S ${pt(2, 3).x} ${pt(2, 3).y}, ${pt(3, 4).x} ${pt(3, 4).y} S ${P[ROWS][4].x} ${P[ROWS][4].y - 20}, ${P[ROWS][4].x} ${P[ROWS][4].y}`,
    },
    {
      name: "River Gurara",
      d: `M ${P[4][0].x} ${P[4][0].y} C ${pt(1, 4).x} ${pt(1, 4).y}, ${pt(2, 4).x} ${pt(2, 4).y + 10}, ${pt(3, 5).x} ${pt(3, 5).y}`,
    },
  ];

  // hotspots (active alert markers)
  const HOTSPOTS = ["Birnin Gwari", "Igabi", "Zaria", "Kauru", "Kaduna North"].map((n) => ({
    name: n, ...lgaByName[n].center, risk: lgaByName[n].risk,
  }));

  /* ============================================================
     INCIDENTS
     ============================================================ */
  const NOW = new Date("2026-06-11T13:42:00");
  function mins(m) { return new Date(NOW.getTime() - m * 60000); }
  function fmtTime(d) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  function ago(d) {
    const m = Math.round((NOW - d) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60);
    return h + "h " + (m % 60) + "m ago";
  }

  const INCIDENTS = [
    { id: "INC-2061", type: "Flood", icon: "flood", lga: "Igabi", ward: "Rigachikun", sev: 3, status: "Responding", channel: "App", reporter: "Field Officer A. Musa", at: mins(38), team: "Zonal Response — Central", desc: "River Kaduna overtopped banks at Rigachikun. ~140 households affected, 3 culverts submerged, primary school cut off.", coords: "10.6731, 7.4012", sla: "ok",
      chain: [["Community", "Volunteer report via App", 38], ["LGA", "Validated by Desk Officer", 31], ["Zonal", "Verified · teams assigned", 22], ["HQ", "Classified Level 3 · EOC monitoring", 16]] },
    { id: "INC-2060", type: "Conflict", icon: "conflict", lga: "Birnin Gwari", ward: "Kuyello", sev: 3, status: "Responding", channel: "Call", reporter: "Security Liaison", at: mins(64), team: "IDP Protocol — West", desc: "Displacement influx following security incident. Est. 600+ persons moving toward Birnin Gwari town. IDP camp protocol activated.", coords: "11.0214, 6.7401", sla: "ok",
      chain: [["Community", "Traditional leader alert", 64], ["LGA", "Desk officer logged", 58], ["Zonal", "Verified · camp activation", 47], ["HQ", "Level 3 · inter-agency coordination", 40]] },
    { id: "INC-2059", type: "Fire", icon: "fire", lga: "Kaduna North", ward: "Kawo", sev: 2, status: "Responding", channel: "SMS", reporter: "Citizen (USSD)", at: mins(19), team: "Fire Service — Kawo Stn", desc: "Market fire outbreak, Kawo. 4 lockup shops affected, spreading risk to adjacent fuel store. Fire service en route.", coords: "10.5512, 7.4356", sla: "ok",
      chain: [["Community", "USSD short-code report", 19], ["LGA", "Validated · 9m", 12], ["Zonal", "Fire service dispatched", 7]] },
    { id: "INC-2058", type: "Epidemic", icon: "health", lga: "Zaria", ward: "Tudun Wada", sev: 2, status: "Verified", channel: "App", reporter: "PHC Surveillance", at: mins(95), team: "—", desc: "Cluster of acute watery diarrhoea cases (cholera suspected) reported by Tudun Wada PHC. Samples sent for confirmation.", coords: "11.0667, 7.7000", sla: "watch",
      chain: [["Community", "PHC surveillance entry", 95], ["LGA", "Health focal validated", 80], ["Zonal", "Verified · awaiting HQ", 62]] },
    { id: "INC-2057", type: "Flood", icon: "flood", lga: "Kaduna South", ward: "Barnawa", sev: 2, status: "Verified", channel: "WhatsApp", reporter: "Ward Committee", at: mins(52), team: "—", desc: "Flash flooding along Barnawa drainage after 2h downpour. Road impassable, no casualties reported.", coords: "10.4789, 7.4201", sla: "ok",
      chain: [["Community", "Ward committee (WhatsApp)", 52], ["LGA", "Desk officer validated", 44], ["Zonal", "Verified", 33]] },
    { id: "INC-2056", type: "Building Collapse", icon: "collapse", lga: "Kaduna North", ward: "Doka", sev: 2, status: "Reported", channel: "Call", reporter: "Citizen", at: mins(8), team: "—", desc: "Two-storey building partial collapse at Doka. Unconfirmed persons trapped. Awaiting LGA validation.", coords: "10.5301, 7.4389", sla: "watch",
      chain: [["Community", "Toll-free call centre", 8]] },
    { id: "INC-2055", type: "Conflict", icon: "conflict", lga: "Kauru", ward: "Geshere", sev: 2, status: "Verified", channel: "App", reporter: "Field Officer", at: mins(140), team: "—", desc: "Localised displacement, ~80 households sheltering at Geshere church. Needs assessment ongoing.", coords: "10.5512, 8.1789", sla: "ok",
      chain: [["Community", "Volunteer report", 140], ["LGA", "Validated", 128], ["Zonal", "Verified", 110]] },
    { id: "INC-2054", type: "RTA", icon: "rta", lga: "Chikun", ward: "Sabon Tasha", sev: 1, status: "Closed", channel: "SMS", reporter: "Citizen", at: mins(210), team: "FRSC / Health", desc: "Multi-vehicle road traffic accident on Kaduna–Abuja expressway. 6 casualties evacuated, scene cleared.", coords: "10.4123, 7.4567", sla: "ok",
      chain: [["Community", "SMS report", 210], ["LGA", "Validated", 203], ["Zonal", "Response complete", 150], ["HQ", "Closed · report filed", 96]] },
    { id: "INC-2053", type: "Flood", icon: "flood", lga: "Lere", ward: "Saminaka", sev: 1, status: "Closed", channel: "App", reporter: "Ward Focal", at: mins(320), team: "LGA Response", desc: "Minor flooding of farmland, Saminaka. No structures affected. Monitored and closed.", coords: "10.3789, 8.5512", sla: "ok",
      chain: [["Community", "Ward focal", 320], ["LGA", "Resolved locally", 300]] },
    { id: "INC-2052", type: "Fire", icon: "fire", lga: "Sabon Gari", ward: "Samaru", sev: 1, status: "Closed", channel: "Call", reporter: "Citizen", at: mins(400), team: "Fire Service", desc: "Domestic fire, Samaru. Contained by fire service, one structure damaged, no casualties.", coords: "11.1601, 7.6389", sla: "ok",
      chain: [["Community", "Call centre", 400], ["LGA", "Validated", 392], ["Zonal", "Closed", 350]] },
  ];

  const STATUS_FLOW = ["Reported", "Verified", "Responding", "Closed"];

  /* ============================================================
     EARLY WARNING — thresholds, triggers, dissemination
     ============================================================ */
  const GAUGES = [
    { id: "g1", name: "River Kaduna — Kaduna Bridge", type: "river", unit: "m", value: 8.4, warn: 7.5, danger: 8.0, max: 10, lga: "Kaduna North", trend: [6.1, 6.4, 6.9, 7.2, 7.8, 8.1, 8.4], state: "danger" },
    { id: "g2", name: "River Gurara — Kagarko", type: "river", unit: "m", value: 5.9, warn: 6.0, danger: 6.8, max: 8, lga: "Kagarko", trend: [4.8, 5.0, 5.1, 5.3, 5.6, 5.7, 5.9], state: "warn" },
    { id: "g3", name: "Rainfall — Igabi AWS", type: "rain", unit: "mm/72h", value: 168, warn: 120, danger: 150, max: 220, lga: "Igabi", trend: [40, 62, 88, 110, 132, 151, 168], state: "danger" },
    { id: "g4", name: "Rainfall — Zaria AWS", type: "rain", unit: "mm/72h", value: 96, warn: 120, danger: 150, max: 220, lga: "Zaria", trend: [20, 31, 44, 58, 70, 84, 96], state: "ok" },
    { id: "g5", name: "River Kaduna — Kasuwan Magani", type: "river", unit: "m", value: 6.7, warn: 7.0, danger: 7.8, max: 9, lga: "Kajuru", trend: [5.4, 5.6, 5.9, 6.1, 6.3, 6.5, 6.7], state: "ok" },
  ];

  const TRIGGERS = [
    { id: "t1", rule: "Rainfall > 150mm / 72h", lga: "Igabi", fired: mins(46), action: "Flood watch → pre-position relief", level: 3, live: true },
    { id: "t2", rule: "River level ≥ danger mark (8.0m)", lga: "Kaduna North", fired: mins(28), action: "Evacuation advisory issued", level: 3, live: true },
    { id: "t3", rule: "Displacement spike (security feed)", lga: "Birnin Gwari", fired: mins(70), action: "IDP camp protocol activated", level: 3, live: true },
    { id: "t4", rule: "Disease cluster ≥ 5 cases / 24h", lga: "Zaria", fired: mins(92), action: "Epidemic surveillance escalation", level: 2, live: true },
    { id: "t5", rule: "River level ≥ warning mark (6.0m)", lga: "Kagarko", fired: mins(15), action: "Monitoring intensified", level: 1, live: true },
  ];

  const CHANNELS = [
    { name: "SMS Blast", icon: "sms", reach: "1.24M", note: "via MTN · Airtel · Glo", status: "active" },
    { name: "Radio / TV", icon: "radio", reach: "Statewide", note: "Emergency broadcast", status: "active" },
    { name: "Community Sirens", icon: "siren", reach: "42 units", note: "Flood-prone wards", status: "active" },
    { name: "WhatsApp", icon: "chat", reach: "318K", note: "Business API", status: "active" },
    { name: "Town Criers", icon: "people", reach: "Local", note: "Ward committees", status: "standby" },
  ];

  const DISSEMINATION = [
    { ch: "SMS", lang: "Hausa", lga: "Kaduna North", at: mins(26), recipients: "214,500", msg: "GARGAƊI: Ruwan kogi ya yi yawa. Ku guji gabar kogin Kaduna." },
    { ch: "Siren", lang: "—", lga: "Igabi", at: mins(41), recipients: "8 wards", msg: "Flood siren activated — Rigachikun, Turunku corridor." },
    { ch: "Radio", lang: "Hausa/English", lga: "Statewide", at: mins(55), recipients: "Statewide", msg: "Flood advisory broadcast — Central & North zones." },
    { ch: "WhatsApp", lang: "English", lga: "Birnin Gwari", at: mins(68), recipients: "12 groups", msg: "IDP support mobilisation notice to partner network." },
  ];

  // Broadcast desk queue — radio/TV is a person-in-the-loop step
  const BROADCASTS = [
    { id: "BC-4", scope: "Kaduna North", lang: "Hausa", priority: "Urgent", status: "On Air", at: mins(7), operator: "Broadcast Desk · A. Bello",
      msg: "GARGAƊI NA GAGGAWA: Ruwan kogin Kaduna ya wuce matakin hatsari. Mazauna wuraren da ke ƙasa su ƙaura zuwa tudu nan take." },
    { id: "BC-3", scope: "Statewide", lang: "Hausa/English", priority: "Routine", status: "Queued", at: mins(12), operator: null,
      msg: "Weather advisory: heavy rainfall expected across Central and North zones in the next 24 hours. Avoid flood-prone routes." },
    { id: "BC-2", scope: "Birnin Gwari", lang: "Hausa", priority: "Urgent", status: "Queued", at: mins(19), operator: null,
      msg: "Sanarwa: An kafa sansanin agaji ga waɗanda suka rasa matsuguni a Birnin Gwari. Ku tuntuɓi hukumar KADSEMA." },
    { id: "BC-1", scope: "Zaria", lang: "English", priority: "Routine", status: "Aired", at: mins(48), operator: "Broadcast Desk · A. Bello",
      msg: "Public health notice: suspected cholera cluster in Tudun Wada. Boil drinking water and report symptoms to the nearest PHC." },
  ];

  /* ============================================================
     RESOURCES & TEAMS
     ============================================================ */
  const RESOURCES = [
    { name: "Relief food packs", have: 4200, cap: 6000, unit: "packs" },
    { name: "Tarpaulin / shelter kits", have: 880, cap: 2000, unit: "kits" },
    { name: "Water purification", have: 15400, cap: 20000, unit: "sachets" },
    { name: "Rescue boats", have: 9, cap: 14, unit: "units" },
    { name: "Response vehicles", have: 21, cap: 28, unit: "units" },
    { name: "Medical / first-aid kits", have: 540, cap: 800, unit: "kits" },
  ];

  const TEAMS = [
    { name: "Central Zonal Response", base: "Kaduna HQ", status: "Deployed", lga: "Igabi", members: 12 },
    { name: "West IDP Task Force", base: "Birnin Gwari", status: "Deployed", lga: "Birnin Gwari", members: 9 },
    { name: "Fire Service — Kawo", base: "Kaduna North", status: "Deployed", lga: "Kaduna North", members: 6 },
    { name: "East Rapid Assessment", base: "Saminaka", status: "Standby", lga: "Lere", members: 7 },
    { name: "Health Surveillance Unit", base: "Zaria", status: "Active", lga: "Zaria", members: 5 },
  ];

  /* ============================================================
     KPIs / situational metrics
     ============================================================ */
  const KPIS = [
    { label: "Avg alert dissemination", value: "3.8", unit: "min", target: "< 5 min", good: true, spark: [6.2, 5.9, 5.1, 4.6, 4.2, 4.0, 3.8] },
    { label: "Flood forecast accuracy", value: "84", unit: "%", target: "> 80%", good: true, spark: [71, 74, 76, 79, 81, 83, 84] },
    { label: "Avg response time", value: "47", unit: "min", target: "< 60 min", good: true, spark: [78, 72, 66, 61, 55, 51, 47] },
    { label: "Wards connected to EWS", value: "61", unit: "%", target: "100%", good: false, spark: [22, 31, 39, 46, 52, 57, 61] },
  ];

  const HAZARD_STATUS = [
    { name: "Flood", level: "Elevated", v: 0.78, icon: "flood" },
    { name: "Conflict / Displacement", level: "High", v: 0.86, icon: "conflict" },
    { name: "Fire", level: "Moderate", v: 0.5, icon: "fire" },
    { name: "Epidemic", level: "Watch", v: 0.42, icon: "health" },
    { name: "Building Collapse", level: "Low", v: 0.25, icon: "collapse" },
  ];

  // counts
  const counts = {
    active: INCIDENTS.filter((i) => i.status !== "Closed").length,
    responding: INCIDENTS.filter((i) => i.status === "Responding").length,
    level3: INCIDENTS.filter((i) => i.sev === 3 && i.status !== "Closed").length,
    closed24: 14,
    displaced: 7320,
    wardsCovered: 92,
  };

  window.KAD = {
    // geometry
    VB_W, VB_H, LGAS, lgaByName, RIVERS, HOTSPOTS,
    // data
    INCIDENTS, STATUS_FLOW, GAUGES, TRIGGERS, CHANNELS, DISSEMINATION, BROADCASTS,
    RESOURCES, TEAMS, KPIS, HAZARD_STATUS, counts, NOW,
    // helpers
    riskColor, riskBand, fmtTime, ago, mins,
  };
})();
