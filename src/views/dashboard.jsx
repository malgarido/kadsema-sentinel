/* ============================================================
   KADSEMA SENTINEL — EOC Command Dashboard
   ============================================================ */
function HazardStrip() {
  return (
    <div className="hazard-strip">
      {KAD.HAZARD_STATUS.map((h) => (
        <div key={h.name} className="hazard-cell" style={{ "--hc": KAD.riskColor(h.v) }}>
          <Icon name={h.icon} size={18} />
          <div className="hazard-meta">
            <span className="hazard-name">{h.name}</span>
            <span className="hazard-level">{h.level}</span>
          </div>
          <span className="hazard-dot" />
        </div>
      ))}
    </div>
  );
}

function IncidentRow({ inc, onOpen }) {
  return (
    <button className="inc-row" onClick={() => onOpen(inc)}>
      <span className="inc-icon" style={{ "--ic": inc.sev === 3 ? "var(--red)" : inc.sev === 2 ? "var(--orange)" : "var(--gold)" }}>
        <Icon name={inc.icon} size={16} />
      </span>
      <div className="inc-main">
        <div className="inc-top">
          <span className="inc-id">{inc.id}</span>
          <SevBadge sev={inc.sev} />
          <span className="inc-type">{inc.type}</span>
        </div>
        <div className="inc-loc">{inc.ward}, {inc.lga} · <span className="mono">{KAD.ago(inc.at)}</span></div>
      </div>
      <div className="inc-right">
        <StatusDot status={inc.status} label={false} />
        <span className="inc-status-txt" style={{ color: STATUS_COLOR[inc.status] }}>{inc.status}</span>
      </div>
    </button>
  );
}

function Dashboard({ onOpenIncident, goTo, query }) {
  SentinelStore.useStore();
  const all = SentinelStore.incidentsView();
  const active = all.filter((i) => i.status !== "Closed");
  const c = SentinelStore.counts();
  const q = (query || "").trim().toLowerCase();
  const feed = q ? active.filter((i) =>
    [i.id, i.type, i.lga, i.ward].some((f) => (f || "").toLowerCase().includes(q))
  ) : active;
  return (
    <div className="view dash">
      {/* KPI row */}
      <div className="kpi-row">
        <div className="bigstat">
          <div className="bigstat-num" style={{ color: "var(--red)" }}>{c.level3}</div>
          <div className="bigstat-lbl">Level 3<br />emergencies</div>
        </div>
        <div className="bigstat">
          <div className="bigstat-num">{c.active}</div>
          <div className="bigstat-lbl">Active<br />incidents</div>
        </div>
        <div className="bigstat">
          <div className="bigstat-num">{c.displaced.toLocaleString()}</div>
          <div className="bigstat-lbl">Persons<br />displaced</div>
        </div>
        {KAD.KPIS.map((k) => (
          <Stat key={k.label} label={k.label} value={k.value} unit={k.unit}
            spark={k.spark} target={k.target} color={k.good ? "var(--green)" : "var(--gold)"} />
        ))}
      </div>

      <HazardStrip />

      {/* main grid */}
      <div className="dash-grid">
        <Panel title="Live operational picture" icon="map" className="dash-map"
          sub="Kaduna State · all zones"
          action={<button className="link-btn" onClick={() => goTo("map")}>Open risk map <Icon name="arrowRight" size={13} /></button>}
          pad={false}>
          <div className="dash-map-wrap">
            <KadunaMap metric="risk" incidents={active} compact={false}
              onSelect={(n) => goTo("map", n)} labels={true} />
          </div>
        </Panel>

        <Panel title="Active incidents" icon="incidents"
          sub={q ? feed.length + " match" + (feed.length !== 1 ? "es" : "") : active.length + " open"}
          action={<button className="link-btn" onClick={() => goTo("incidents")}>Board <Icon name="arrowRight" size={13} /></button>}
          pad={false} className="dash-feed">
          <div className="inc-feed">
            {feed.length === 0
              ? <div style={{ padding: "28px 14px", textAlign: "center", color: "var(--text-mute)", fontFamily: "var(--mono)", fontSize: 12 }}>No incidents match "{query}"</div>
              : feed.map((inc) => <IncidentRow key={inc.id} inc={inc} onOpen={onOpenIncident} />)}
          </div>
        </Panel>

        <Panel title="Early warning triggers" icon="warning"
          sub="live" className="dash-triggers"
          action={<button className="link-btn" onClick={() => goTo("ews")}>Console <Icon name="arrowRight" size={13} /></button>}>
          <div className="trig-list">
            {KAD.TRIGGERS.map((t) => (
              <div key={t.id} className="trig">
                <span className={"trig-lvl lvl" + t.level}>L{t.level}</span>
                <div className="trig-body">
                  <div className="trig-rule">{t.rule}</div>
                  <div className="trig-meta"><b>{t.lga}</b> · {t.action}</div>
                </div>
                <span className="trig-time mono">{KAD.ago(t.fired)}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Resource readiness" icon="box" className="dash-res">
          <div className="res-grid">
            {KAD.RESOURCES.map((r) => {
              const pct = r.have / r.cap;
              const col = pct < 0.4 ? "var(--red)" : pct < 0.6 ? "var(--orange)" : "var(--green)";
              return (
                <div key={r.name} className="res">
                  <div className="res-top">
                    <span className="res-name">{r.name}</span>
                    <span className="res-val mono">{r.have.toLocaleString()}<i>/{r.cap.toLocaleString()}</i></span>
                  </div>
                  <Bar value={r.have} max={r.cap} color={col} />
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Response teams" icon="people" className="dash-teams"
          sub={KAD.TEAMS.filter((t) => t.status === "Deployed").length + " deployed"}>
          <div className="team-list">
            {KAD.TEAMS.map((t) => (
              <div key={t.name} className="team">
                <span className={"team-dot " + t.status.toLowerCase()} />
                <div className="team-body">
                  <div className="team-name">{t.name}</div>
                  <div className="team-meta">{t.base} · {t.members} pax</div>
                </div>
                <span className="team-status">{t.status}<br /><i>{t.lga}</i></span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
