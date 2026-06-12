/* ============================================================
   KADSEMA SENTINEL — Incident Management (board + filters)
   ============================================================ */
const { useState: useStateInc } = React;

function IncCard({ inc, onOpen }) {
  const col = inc.sev === 3 ? "var(--red)" : inc.sev === 2 ? "var(--orange)" : "var(--gold)";
  return (
    <button className="icard" onClick={() => onOpen(inc)} style={{ "--ic": col }}>
      <div className="icard-top">
        <span className="inc-icon" style={{ "--ic": col }}><Icon name={inc.icon} size={15} /></span>
        <div className="icard-id">
          <span className="inc-id">{inc.id}</span>
          <SevBadge sev={inc.sev} />
        </div>
        {inc.sla === "watch" && <span className="sla-flag" title="SLA at risk"><Icon name="clock" size={13} /></span>}
      </div>
      <div className="icard-type">{inc.type}</div>
      <div className="icard-loc"><Icon name="pin" size={12} />{inc.ward}, {inc.lga}</div>
      <div className="icard-foot">
        <span className="tag-chip sm"><Icon name="signal" size={11} />{inc.channel}</span>
        <span className="mono icard-time">{KAD.ago(inc.at)}</span>
      </div>
    </button>
  );
}

function IncidentsView({ onOpen, onLog }) {
  SentinelStore.useStore();
  const [zone, setZone] = useStateInc("All");
  const [sev, setSev] = useStateInc(0);
  const zones = ["All", "Central", "North", "South", "East", "West"];

  const allInc = SentinelStore.incidentsView();
  let list = allInc;
  if (zone !== "All") list = list.filter((i) => (KAD.lgaByName[i.lga] || {}).zone === zone);
  if (sev) list = list.filter((i) => i.sev === sev);

  const cols = KAD.STATUS_FLOW.map((s) => ({ status: s, items: list.filter((i) => i.status === s) }));
  const slaAtRisk = allInc.filter((i) => i.sla === "watch" && i.status !== "Closed").length;

  return (
    <div className="view">
      <div className="inc-toolbar">
        <div className="seg">
          {zones.map((z) => (
            <button key={z} className={"seg-btn " + (zone === z ? "on" : "")} onClick={() => setZone(z)}>{z}</button>
          ))}
        </div>
        <div className="seg">
          <button className={"seg-btn " + (sev === 0 ? "on" : "")} onClick={() => setSev(0)}>All levels</button>
          {[1, 2, 3].map((s) => (
            <button key={s} className={"seg-btn " + (sev === s ? "on" : "")} onClick={() => setSev(s)}>L{s}</button>
          ))}
        </div>
        <div className="inc-toolbar-r">
          {slaAtRisk > 0 && <span className="sla-pill"><Icon name="clock" size={13} />{slaAtRisk} SLA at risk</span>}
          <button className="btn ghost sm"><Icon name="filter" size={14} />More filters</button>
          <button className="btn primary sm" onClick={onLog}><Icon name="plus" size={14} />Log incident</button>
        </div>
      </div>

      <div className="board">
        {cols.map((c) => (
          <div key={c.status} className="board-col">
            <div className="board-col-head">
              <span className="bch-dot" style={{ background: STATUS_COLOR[c.status] }} />
              <span className="bch-name">{c.status}</span>
              <span className="bch-count">{c.items.length}</span>
            </div>
            <div className="board-col-body">
              {c.items.map((inc) => <IncCard key={inc.id} inc={inc} onOpen={onOpen} />)}
              {c.items.length === 0 && <div className="board-empty">No incidents</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.IncidentsView = IncidentsView;
