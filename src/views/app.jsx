/* ============================================================
   KADSEMA SENTINEL — App shell (top bar, nav, router)
   ============================================================ */
const { useState, useEffect } = React;

const NAV = [
  { id: "dash", label: "Command", icon: "dashboard" },
  { id: "map", label: "Risk Map", icon: "map" },
  { id: "incidents", label: "Incidents", icon: "incidents" },
  { id: "ews", label: "Early Warning", icon: "warning" },
  { id: "broadcast", label: "Broadcast", icon: "broadcast" },
  { id: "field", label: "Field App", icon: "mobile" },
];

function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="clock">
      <span className="clock-time mono">{t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
      <span className="clock-date">{t.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })} · WAT</span>
    </div>
  );
}

function TopBar({ view, query, setQuery }) {
  SentinelStore.useStore();
  const c = SentinelStore.counts();
  const alertCount = c.level3 + c.reported + c.pendingBroadcast;

  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const dn = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", dn); };
  }, []);

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><span /></div>
        <div className="brand-txt">
          <div className="brand-name">SENTINEL</div>
          <div className="brand-sub">KADSEMA · Emergency Operations</div>
        </div>
      </div>

      <div className="searchbox">
        <Icon name="search" size={16} />
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search incidents, LGAs, wards…" />
        <kbd>⌘K</kbd>
      </div>

      <div className="topbar-right">
        <div className={"sys-pill " + (online ? "ok" : "err")}>
          <span className="sys-dot" />
          <div>
            <b>{online ? "EOC ONLINE" : "OFFLINE"}</b>
            <i>{online ? "All systems nominal" : "No connection"}</i>
          </div>
        </div>
        <Clock />
        <button className="ic-btn" title="Alerts">
          <Icon name="bell" size={18} />
          {alertCount > 0 && <span className="ic-badge">{alertCount > 99 ? "99+" : alertCount}</span>}
        </button>
        <div className="user-chip">
          <div className="avatar">SR</div>
          <div className="user-meta"><b>Situation Room</b><i>HQ · Analyst</i></div>
        </div>
      </div>
    </header>
  );
}

function SideNav({ view, goTo }) {
  SentinelStore.useStore();
  const pending = SentinelStore.counts().pendingBroadcast;
  return (
    <nav className="sidenav">
      <div className="nav-items">
        {NAV.map((n) => (
          <button key={n.id} className={"nav-item " + (view === n.id ? "on" : "")}
            onClick={() => goTo(n.id)} title={n.label}>
            <Icon name={n.icon} size={20} />
            <span>{n.label}</span>
            {n.id === "broadcast" && pending > 0 && <i className="nav-badge">{pending}</i>}
            {view === n.id && <i className="nav-active" />}
          </button>
        ))}
      </div>
      <div className="nav-foot">
        <div className="nav-status">
          <div className="nav-status-row"><Icon name="database" size={13} /><span>Data feeds</span><b className="ok">7/7</b></div>
          <div className="nav-status-row"><Icon name="signal" size={13} /><span>Telecom</span><b className="ok">Up</b></div>
          <div className="nav-status-row"><Icon name="broadcast" size={13} /><span>Sirens</span><b className="warn">42/48</b></div>
        </div>
        <div className="nav-zone">ZONE: ALL · v2.4</div>
        <button className="nav-reset" onClick={() => SentinelStore.reset()} title="Reset demo data to baseline">
          <Icon name="refresh" size={12} />Reset demo
        </button>
      </div>
    </nav>
  );
}

/* ---------- incident detail drawer (live) ---------- */
function IncidentDrawer({ inc, onClose, goTo }) {
  SentinelStore.useStore();
  if (!inc) return null;
  const live = SentinelStore.incidentsView().find((i) => i.id === inc.id) || inc;
  const col = live.sev === 3 ? "var(--red)" : live.sev === 2 ? "var(--orange)" : "var(--gold)";
  const nextLabel = { Reported: "Validate incident", Verified: "Escalate response", Responding: "Close incident" }[live.status];
  const nextIcon = { Reported: "check", Verified: "up", Responding: "check" }[live.status];

  return (
    <div className="drawer-scrim" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div className="drawer-head-l">
            <span className="inc-icon big" style={{ "--ic": col }}>
              <Icon name={live.icon} size={20} />
            </span>
            <div>
              <div className="drawer-id">{live.id} · {live.type}</div>
              <div className="drawer-loc">{live.ward}, {live.lga} LGA</div>
            </div>
          </div>
          <button className="ic-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </header>

        <div className="drawer-tags">
          <SevBadge sev={live.sev} withName />
          <StatusDot status={live.status} />
          <span className="tag-chip"><Icon name="signal" size={12} />{live.channel}</span>
          <span className="tag-chip mono"><Icon name="pin" size={12} />{live.coords}</span>
        </div>

        <div className="drawer-section">
          <div className="ds-label">Situation</div>
          <p className="drawer-desc">{live.desc}</p>
        </div>

        <div className="drawer-grid">
          <div><span className="dg-k">Reported</span><span className="dg-v mono">{KAD.fmtTime(live.at)} · {KAD.ago(live.at)}</span></div>
          <div><span className="dg-k">Reporter</span><span className="dg-v">{live.reporter}</span></div>
          <div><span className="dg-k">Assigned</span><span className="dg-v">{live.team}</span></div>
          <div><span className="dg-k">SLA</span><span className={"dg-v " + (live.sla === "watch" ? "warn" : "okc")}>{live.sla === "watch" ? "At risk" : "On track"}</span></div>
        </div>

        <div className="drawer-section">
          <div className="ds-label">Escalation chain</div>
          <div className="chain">
            {live.chain.map((c, i) => (
              <div key={i} className="chain-step">
                <div className="chain-line">
                  <span className={"chain-dot lvl-" + c[0].toLowerCase()} />
                  {i < live.chain.length - 1 && <span className="chain-rod" />}
                </div>
                <div className="chain-body">
                  <div className="chain-actor">{c[0]}</div>
                  <div className="chain-note">{c[1]}</div>
                  <div className="chain-time mono">{KAD.ago(KAD.mins(c[2]))}</div>
                </div>
              </div>
            ))}
            {live.status !== "Closed" && (
              <div className="chain-step pending">
                <div className="chain-line"><span className="chain-dot next" /></div>
                <div className="chain-body"><div className="chain-actor dim">Awaiting next action…</div></div>
              </div>
            )}
          </div>
        </div>

        <div className="drawer-actions">
          {nextLabel
            ? <button className="btn primary" onClick={() => SentinelStore.advanceIncident(live.id)}><Icon name={nextIcon} size={15} />{nextLabel}</button>
            : <button className="btn ghost" disabled style={{ opacity: .55, cursor: "default" }}><Icon name="check" size={15} />Incident closed</button>}
          <button className="btn ghost" onClick={() => SentinelStore.toast("Team assignment requested for " + live.id, "info")}><Icon name="people" size={15} />Assign team</button>
          <button className="btn ghost" onClick={() => { onClose(); goTo("ews"); }}><Icon name="broadcast" size={15} />Issue alert</button>
        </div>
      </aside>
    </div>
  );
}

/* ---------- log incident modal ---------- */
const INC_TYPES = [["Flood", "flood"], ["Fire", "fire"], ["Conflict", "conflict"], ["Epidemic", "health"], ["Building Collapse", "collapse"], ["RTA", "rta"]];
const INC_CHANNELS = ["EOC Console", "SMS / USSD", "Call centre", "WhatsApp", "Field App", "Volunteer"];

function LogModal({ onClose }) {
  const [type, setType] = useState("Flood");
  const [lga, setLga] = useState("Igabi");
  const [ward, setWard] = useState("");
  const [sev, setSev] = useState(2);
  const [channel, setChannel] = useState("EOC Console");
  const [desc, setDesc] = useState("");

  function submit() {
    const icon = (INC_TYPES.find((t) => t[0] === type) || [])[1] || "incidents";
    SentinelStore.addIncident({ type, icon, lga, ward: ward.trim(), sev, channel, desc: desc.trim() });
    onClose();
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div><Eyebrow>Incident intake</Eyebrow><h2 className="modal-title">Log new incident</h2></div>
          <button className="ic-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </header>

        <div className="modal-body">
          <div className="mfield">
            <label>Hazard type</label>
            <div className="type-grid">
              {INC_TYPES.map(([n, ic]) => (
                <button key={n} className={"type-cell " + (type === n ? "on" : "")} onClick={() => setType(n)}>
                  <Icon name={ic} size={18} /><span>{n}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mfield-row">
            <div className="mfield">
              <label>LGA</label>
              <select value={lga} onChange={(e) => setLga(e.target.value)}>
                {KAD.LGAS.map((l) => <option key={l.id} value={l.name}>{l.name}</option>)}
              </select>
            </div>
            <div className="mfield">
              <label>Ward</label>
              <input value={ward} onChange={(e) => setWard(e.target.value)} placeholder="e.g. Rigachikun" />
            </div>
          </div>
          <div className="mfield-row">
            <div className="mfield">
              <label>Severity</label>
              <div className="seg sm sevseg">
                {[1, 2, 3].map((s) => (
                  <button key={s} className={"seg-btn " + (sev === s ? "on s" + s : "")} onClick={() => setSev(s)}>
                    L{s} · {SEV_META[s].name}
                  </button>
                ))}
              </div>
            </div>
            <div className="mfield">
              <label>Source channel</label>
              <select value={channel} onChange={(e) => setChannel(e.target.value)}>
                {INC_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="mfield">
            <label>Situation report</label>
            <textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder="Brief description of the incident, persons affected, access conditions…" />
          </div>
        </div>

        <footer className="modal-foot">
          <span className="modal-note">Logged as <b>Reported</b> · routed to {lga} desk for validation</span>
          <div className="modal-foot-btns">
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={submit}><Icon name="plus" size={15} />Log incident</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ---------- toast host ---------- */
function ToastHost() {
  const s = SentinelStore.useStore();
  return (
    <div className="toast-host">
      {s.toasts.map((t) => (
        <div key={t.id} className={"toast " + t.kind} onClick={() => SentinelStore.dismissToast(t.id)}>
          <Icon name={t.kind === "alert" ? "broadcast" : t.kind === "info" ? "refresh" : "check"} size={16} />
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- root ---------- */
function App() {
  const [view, setView] = useState("dash");
  const [query, setQuery] = useState("");
  const [openInc, setOpenInc] = useState(null);
  const [mapFocus, setMapFocus] = useState(null);
  const [logOpen, setLogOpen] = useState(false);

  function goTo(v, arg) {
    setView(v);
    if (v === "map") setMapFocus(arg || null);
    window.scrollTo(0, 0);
  }
  function refresh() {
    SentinelStore.toast("Live data feeds refreshed · " + KAD.fmtTime(new Date()), "info");
  }

  const views = {
    dash: <Dashboard onOpenIncident={setOpenInc} goTo={goTo} query={query} />,
    map: window.RiskMapView ? <RiskMapView focus={mapFocus} /> : <Placeholder name="Risk Map" />,
    incidents: window.IncidentsView ? <IncidentsView onOpen={setOpenInc} onLog={() => setLogOpen(true)} query={query} /> : <Placeholder name="Incidents" />,
    ews: window.EwsView ? <EwsView /> : <Placeholder name="Early Warning" />,
    broadcast: window.BroadcastView ? <BroadcastView /> : <Placeholder name="Broadcast" />,
    field: window.FieldView ? <FieldView /> : <Placeholder name="Field App" />,
  };

  const cur = NAV.find((n) => n.id === view);

  return (
    <div className="app">
      <TopBar view={view} query={query} setQuery={setQuery} />
      <div className="app-body">
        <SideNav view={view} goTo={goTo} />
        <main className="main">
          <div className="view-head">
            <div>
              <Eyebrow>{cur.label === "Command" ? "Emergency Operations Centre" : "KADSEMA Sentinel"}</Eyebrow>
              <h1 className="view-title">{
                { dash: "Command Overview", map: "GIS Risk & Hazard Map", incidents: "Incident Management", ews: "Early Warning Console", broadcast: "Broadcast Desk", field: "Field Reporting App" }[view]
              }</h1>
            </div>
            <div className="view-head-r">
              <button className="btn ghost sm" onClick={refresh}><Icon name="refresh" size={14} />Refresh</button>
              <button className="btn ghost sm" onClick={() => setLogOpen(true)}><Icon name="plus" size={14} />Log incident</button>
              <button className="btn primary sm" onClick={() => goTo("ews")}><Icon name="broadcast" size={14} />Issue alert</button>
            </div>
          </div>
          {views[view]}
        </main>
      </div>
      <IncidentDrawer inc={openInc} onClose={() => setOpenInc(null)} goTo={goTo} />
      {logOpen && <LogModal onClose={() => setLogOpen(false)} />}
      <ToastHost />
    </div>
  );
}

function Placeholder({ name }) {
  return <div className="view"><div className="placeholder">{name} — loading…</div></div>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
