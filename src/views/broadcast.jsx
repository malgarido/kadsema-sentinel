/* ============================================================
   KADSEMA SENTINEL — Broadcast Desk
   Human-in-the-loop radio / TV queue. Receives alerts dispatched
   on the Radio channel (from the Early Warning console) and lets
   an operator read them on air and mark them aired.
   ============================================================ */
const { useState: useStateBc } = React;

const BC_PRIORITY = { Urgent: "var(--red)", Routine: "var(--gold)" };
const BC_STATUS = {
  Queued: { c: "var(--orange)", label: "Queued" },
  "On Air": { c: "var(--red)", label: "On Air" },
  Aired: { c: "var(--green)", label: "Aired" },
};

function BroadcastCard({ b, onSelect, selected }) {
  const s = BC_STATUS[b.status];
  return (
    <button className={"bc-card " + (selected ? "on " : "") + b.status.replace(/\s/g, "").toLowerCase()}
      style={{ "--pc": BC_PRIORITY[b.priority], "--sc": s.c }} onClick={() => onSelect(b)}>
      <div className="bc-card-top">
        <span className="bc-id mono">{b.id}</span>
        <span className="bc-priority" style={{ "--pc": BC_PRIORITY[b.priority] }}>{b.priority}</span>
        {b.status === "On Air" && <span className="bc-onair"><span className="oa-dot" />ON AIR</span>}
      </div>
      <div className="bc-scope"><Icon name="pin" size={12} />{b.scope} · <span className="bc-lang">{b.lang}</span></div>
      <div className="bc-snippet">{b.msg}</div>
      <div className="bc-card-foot">
        <span className="bc-status-tag" style={{ color: s.c }}><span className="bc-dot" style={{ background: s.c }} />{s.label}</span>
        <span className="mono bc-time">{KAD.ago(b.at)}</span>
      </div>
    </button>
  );
}

function BroadcastView() {
  SentinelStore.useStore();
  const all = SentinelStore.broadcastView();
  const [filter, setFilter] = useStateBc("All");
  const [sel, setSel] = useStateBc(null);

  const filtered = filter === "All" ? all : all.filter((b) => b.status === filter);
  const current = sel ? all.find((b) => b.id === sel.id) : (all.find((b) => b.status === "On Air") || all.find((b) => b.status === "Queued") || all[0]);
  const queued = all.filter((b) => b.status === "Queued").length;
  const onAir = all.find((b) => b.status === "On Air");

  return (
    <div className="view bc-view">
      {/* live status bar */}
      <div className="bc-statusbar">
        <div className={"bc-live " + (onAir ? "active" : "")}>
          <span className="bc-live-ring"><span /></span>
          <div>
            <div className="bc-live-label">{onAir ? "ON AIR NOW" : "STUDIO IDLE"}</div>
            <div className="bc-live-detail">{onAir ? onAir.scope + " · " + onAir.lang : "No active broadcast"}</div>
          </div>
        </div>
        <div className="bc-metrics">
          <div className="bc-metric"><b>{queued}</b><i>in queue</i></div>
          <div className="bc-metric"><b>{all.filter((b) => b.status === "Aired").length}</b><i>aired today</i></div>
          <div className="bc-metric"><b>Hausa · English</b><i>languages</i></div>
        </div>
        <div className="bc-station">
          <Icon name="radio" size={16} />
          <div><b>KADSEMA Broadcast Desk</b><i>Kaduna State Media Corp · FRCN</i></div>
        </div>
      </div>

      <div className="bc-grid">
        {/* queue list */}
        <Panel title="Broadcast queue" icon="broadcast" sub={queued + " pending"} pad={false}
          action={
            <div className="seg sm">
              {["All", "Queued", "On Air", "Aired"].map((f) => (
                <button key={f} className={"seg-btn " + (filter === f ? "on" : "")} onClick={() => setFilter(f)}>{f}</button>
              ))}
            </div>
          }>
          <div className="bc-list">
            {filtered.length === 0 && <div className="bc-empty">Nothing {filter !== "All" ? "in “" + filter + "”" : "queued"}. Alerts dispatched on the <b>Radio</b> channel arrive here.</div>}
            {filtered.map((b) => <BroadcastCard key={b.id} b={b} selected={current && current.id === b.id} onSelect={(x) => setSel(x)} />)}
          </div>
        </Panel>

        {/* teleprompter / read panel */}
        <Panel title="Read panel" icon="eye" sub={current ? current.id : "—"} className="bc-read-panel">
          {current ? (
            <div className="bc-read">
              <div className="bc-read-head">
                <div className="bc-read-tags">
                  <span className="bc-priority" style={{ "--pc": BC_PRIORITY[current.priority] }}>{current.priority}</span>
                  <span className="tag-chip"><Icon name="pin" size={12} />{current.scope}</span>
                  <span className="tag-chip">{current.lang}</span>
                  <span className="bc-status-tag" style={{ color: BC_STATUS[current.status].c }}>
                    <span className="bc-dot" style={{ background: BC_STATUS[current.status].c }} />{current.status}</span>
                </div>
                <span className="mono bc-read-time">{KAD.fmtTime(current.at)}</span>
              </div>

              <div className="bc-prompter">
                <div className="bc-prompter-label">⏵ ON-AIR SCRIPT</div>
                <p className="bc-script">{current.msg}</p>
              </div>

              {current.operator && <div className="bc-operator"><Icon name="user" size={13} />{current.operator}</div>}

              <div className="bc-read-actions">
                {current.status === "Queued" && (
                  <button className="btn primary" onClick={() => SentinelStore.setBroadcastStatus(current.id, "On Air")}>
                    <Icon name="broadcast" size={15} />Take on air
                  </button>
                )}
                {current.status === "On Air" && (
                  <>
                    <button className="btn primary" onClick={() => SentinelStore.setBroadcastStatus(current.id, "Aired")}>
                      <Icon name="check" size={15} />Mark aired
                    </button>
                    <button className="btn ghost" onClick={() => SentinelStore.setBroadcastStatus(current.id, "Queued")}>
                      <Icon name="refresh" size={15} />Return to queue
                    </button>
                  </>
                )}
                {current.status === "Aired" && (
                  <button className="btn ghost" onClick={() => SentinelStore.setBroadcastStatus(current.id, "On Air")}>
                    <Icon name="refresh" size={15} />Re-broadcast
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bc-empty big">No broadcast selected.</div>
          )}
        </Panel>
      </div>
    </div>
  );
}

window.BroadcastView = BroadcastView;
