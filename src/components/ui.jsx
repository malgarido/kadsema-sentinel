/* ============================================================
   KADSEMA SENTINEL — Shared UI primitives + icon set
   ============================================================ */

/* ---------- Icon library (24x24 stroke) ---------- */
const ICONS = {
  dashboard: "M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 13h7v8H3z",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
  incidents: "M12 3 2 20h20L12 3zM12 9v5M12 17h.01",
  warning: "M4 4h16M7 4v6a5 5 0 0 0 10 0V4M9 20h6M12 15v5",
  mobile: "M7 2h10v20H7zM10 18h4",
  box: "M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10",
  flood: "M3 14c2 0 2 1.5 4 1.5S9 14 11 14s2 1.5 4 1.5S17 14 19 14M3 19c2 0 2 1.5 4 1.5S9 19 11 19s2 1.5 4 1.5S17 19 21 19M12 3c2.5 3 4 5 4 7a4 4 0 0 1-8 0c0-2 1.5-4 4-7z",
  fire: "M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-2.5C9 10 9 12 10.5 12 9.5 9 12 6 12 3z",
  conflict: "M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5l-8-3zM9.5 9.5l5 5M14.5 9.5l-5 5",
  health: "M12 3h0a3 3 0 0 1 3 3v3h3a3 3 0 0 1 0 6h-3v3a3 3 0 0 1-6 0v-3H6a3 3 0 0 1 0-6h3V6a3 3 0 0 1 3-3z",
  collapse: "M4 21V9l7-5 7 5M4 21h16M9 21v-5h6v5M3 9l9-6 9 6",
  rta: "M5 16l1-5 2-4h8l2 4 1 5M5 16v3h2v-2M19 16v3h-2v-2M5 16h14M8 16v0M16 16v0",
  sms: "M4 5h16v11H8l-4 4V5z",
  radio: "M5 11a7 7 0 0 1 14 0M8 12a4 4 0 0 1 8 0M12 12v0M9 19h6l-1.5-6h-3L9 19z",
  siren: "M7 20v-7a5 5 0 0 1 10 0v7M5 20h14M12 4V2M19 7l1.5-1.5M5 7 3.5 5.5",
  chat: "M4 5h16v10H9l-5 4V5z",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M17 11a3 3 0 1 0-2-5.2M21 20a6 6 0 0 0-5-5.9",
  search: "M11 11m-7 0a7 7 0 1 0 14 0 7 7 0 1 0-14 0M21 21l-5-5",
  bell: "M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 21a2 2 0 0 0 4 0",
  clock: "M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 7v5l3 2",
  pin: "M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11zM12 10m-2.5 0a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0",
  layers: "M12 3 2 8l10 5 10-5-10-5zM2 13l10 5 10-5M2 18l10 5 10-5",
  up: "M12 19V5M5 12l7-7 7 7",
  down: "M12 5v14M5 12l7 7 7-7",
  check: "M4 12l5 5L20 6",
  x: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  menu: "M4 7h16M4 12h16M4 17h16",
  signal: "M2 20h2v-4H2zM7 20h2v-8H7zM12 20h2v-12h-2zM17 20h2V4h-2z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  filter: "M3 5h18l-7 8v6l-4-2v-4L3 5z",
  refresh: "M21 12a9 9 0 1 1-3-6.7M21 4v4h-4",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zM12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  broadcast: "M12 12v0M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13",
  shield: "M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5l-8-3z",
  target: "M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 12m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0M12 12v0",
  database: "M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6",
};

function Icon({ name, size = 20, className = "", strokeWidth = 1.7, style = {} }) {
  const d = ICONS[name] || ICONS.target;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"
      strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      {d.split("M").filter(Boolean).map((seg, i) => <path key={i} d={"M" + seg} />)}
    </svg>
  );
}

/* ---------- micro labels ---------- */
function Eyebrow({ children, style }) {
  return <div className="eyebrow" style={style}>{children}</div>;
}

/* ---------- risk / severity badges ---------- */
function RiskPill({ band, risk, small }) {
  const color = KAD.riskColor(typeof risk === "number" ? risk : { Low: 0.2, Moderate: 0.45, High: 0.63, Severe: 0.8, Extreme: 0.95 }[band] || 0.5);
  return (
    <span className="risk-pill" style={{
      "--rc": color, fontSize: small ? 10 : 11,
      padding: small ? "1px 7px" : "2px 9px",
    }}>{band || KAD.riskBand(risk)}</span>
  );
}

const SEV_META = {
  1: { label: "L1", name: "Minor", color: "var(--green)" },
  2: { label: "L2", name: "Moderate", color: "var(--orange)" },
  3: { label: "L3", name: "Major", color: "var(--red)" },
};
function SevBadge({ sev, withName }) {
  const m = SEV_META[sev];
  return (
    <span className="sev-badge" style={{ "--sc": m.color }}>
      <b>{m.label}</b>{withName && <span>{m.name}</span>}
    </span>
  );
}

const STATUS_COLOR = {
  Reported: "var(--blue)", Verified: "var(--gold)",
  Responding: "var(--orange)", Closed: "var(--text-mute)",
};
function StatusDot({ status, label = true }) {
  return (
    <span className="status-dot-wrap">
      <span className="sdot" style={{ background: STATUS_COLOR[status] }} />
      {label && <span style={{ color: STATUS_COLOR[status] }}>{status}</span>}
    </span>
  );
}

/* ---------- sparkline ---------- */
function Sparkline({ data, w = 88, h = 26, color = "var(--gold)", fill = true }) {
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 3 - ((v - min) / rng) * (h - 6)]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line + ` L${w} ${h} L0 ${h} Z`;
  const gid = "spg" + Math.random().toString(36).slice(2, 7);
  return (
    <svg width={w} height={h} className="sparkline">
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={color} stopOpacity="0.28" />
        <stop offset="1" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill={color} />
    </svg>
  );
}

/* ---------- radial gauge ---------- */
function Radial({ value, max, danger, warn, unit, size = 96, color }) {
  const pct = Math.min(1, value / max);
  const R = size / 2 - 8;
  const C = 2 * Math.PI * R;
  const a0 = 0.72; // 72% arc, gap at bottom
  const dash = C * a0;
  const st = color || (value >= danger ? "var(--red)" : value >= warn ? "var(--orange)" : "var(--green)");
  return (
    <svg width={size} height={size} className="radial" style={{ transform: "rotate(135deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--line)" strokeWidth="7"
        strokeDasharray={`${dash} ${C}`} strokeLinecap="round" />
      <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={st} strokeWidth="7"
        strokeDasharray={`${dash * pct} ${C}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray .6s ease" }} />
    </svg>
  );
}

/* ---------- progress bar ---------- */
function Bar({ value, max, color = "var(--gold)", h = 6 }) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <div className="bar" style={{ height: h }}>
      <div className="bar-fill" style={{ width: pct + "%", background: color }} />
    </div>
  );
}

/* ---------- panel shell ---------- */
function Panel({ title, icon, sub, action, children, className = "", pad = true, style }) {
  return (
    <section className={"panel " + className} style={style}>
      {(title || action) && (
        <header className="panel-head">
          <div className="panel-title">
            {icon && <Icon name={icon} size={15} />}
            <span>{title}</span>
            {sub && <em className="panel-sub">{sub}</em>}
          </div>
          {action}
        </header>
      )}
      <div className={pad ? "panel-body" : "panel-body np"}>{children}</div>
    </section>
  );
}

/* ---------- stat card ---------- */
function Stat({ label, value, unit, spark, delta, deltaGood, color = "var(--gold)", target }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-row">
        <div className="stat-value">{value}<span className="stat-unit">{unit}</span></div>
        {spark && <Sparkline data={spark} color={color} w={72} h={28} />}
      </div>
      {(target || delta) && (
        <div className="stat-foot">
          {target && <span className="stat-target">{target}</span>}
          {delta && <span className={"stat-delta " + (deltaGood ? "good" : "bad")}>
            <Icon name={deltaGood ? "down" : "up"} size={11} />{delta}</span>}
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  Icon, ICONS, Eyebrow, RiskPill, SevBadge, SEV_META, StatusDot, STATUS_COLOR,
  Sparkline, Radial, Bar, Panel, Stat,
});
