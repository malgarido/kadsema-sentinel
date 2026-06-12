/* ============================================================
   KADSEMA SENTINEL — Early Warning Console
   ============================================================ */
const { useState: useStateEws } = React;

function GaugeCard({ g }) {
  const stateColor = g.state === "danger" ? "var(--red)" : g.state === "warn" ? "var(--orange)" : "var(--green)";
  const stateLbl = g.state === "danger" ? "DANGER" : g.state === "warn" ? "WARNING" : "NORMAL";
  return (
    <div className="gauge-card" style={{ "--gc": stateColor }}>
      <div className="gauge-head">
        <Icon name={g.type === "river" ? "flood" : "broadcast"} size={15} />
        <span className="gauge-name">{g.name}</span>
      </div>
      <div className="gauge-mid">
        <div className="gauge-readout">
          <span className="gauge-val mono">{g.value}<i>{g.unit}</i></span>
          <span className="gauge-state" style={{ color: stateColor }}>{stateLbl}</span>
        </div>
        <Sparkline data={g.trend} color={stateColor} w={100} h={40} />
      </div>
      <div className="gauge-scale">
        <div className="gauge-track">
          <span className="gauge-mark warn" style={{ left: (g.warn / g.max * 100) + "%" }} title="Warning" />
          <span className="gauge-mark danger" style={{ left: (g.danger / g.max * 100) + "%" }} title="Danger" />
          <span className="gauge-fill" style={{ width: Math.min(100, g.value / g.max * 100) + "%", background: stateColor }} />
        </div>
        <div className="gauge-ticks mono"><span>Warn {g.warn}{g.unit.replace(/\/.*/, "")}</span><span>Danger {g.danger}{g.unit.replace(/\/.*/, "")}</span></div>
      </div>
    </div>
  );
}

function EwsView() {
  SentinelStore.useStore();
  const [tab, setTab] = useStateEws("compose");
  const [msg, setMsg] = useStateEws("FLOOD ALERT: River Kaduna above danger level. Residents of low-lying areas in Kaduna North move to higher ground. — KADSEMA");
  const [lang, setLang] = useStateEws("Hausa");
  const [chans, setChans] = useStateEws({ SMS: true, Siren: true, Radio: false, WhatsApp: true });

  function toggle(c) { setChans((s) => ({ ...s, [c]: !s[c] })); }
  function dispatch() {
    const channels = Object.keys(chans).filter((k) => chans[k]);
    if (!channels.length) { SentinelStore.toast("Select at least one channel first", "info"); return; }
    if (!msg.trim()) { SentinelStore.toast("Alert message is empty", "info"); return; }
    SentinelStore.dispatchAlert({ channels, lang, lga: "Kaduna North", recipients: "~1.24M", msg });
    setTab("log");
  }

  return (
    <div className="view ews">
      {/* monitoring row */}
      <div className="ews-section-label"><span className="esl-dot" /><Eyebrow>Pillar 2 · Monitoring &amp; detection</Eyebrow></div>
      <div className="gauge-row">
        {KAD.GAUGES.map((g) => <GaugeCard key={g.id} g={g} />)}
      </div>

      <div className="ews-grid">
        {/* active triggers */}
        <Panel title="Active warning triggers" icon="warning" sub={KAD.TRIGGERS.length + " live"} pad={false}>
          <div className="trig-table">
            {KAD.TRIGGERS.map((t) => (
              <div key={t.id} className="trig-row">
                <span className={"trig-lvl lvl" + t.level}>L{t.level}</span>
                <div className="trig-row-main">
                  <div className="trig-rule">{t.rule}</div>
                  <div className="trig-meta"><b>{t.lga}</b> · fired {KAD.ago(t.fired)}</div>
                </div>
                <div className="trig-action">{t.action}</div>
                <span className="trig-live"><span className="live-dot" />LIVE</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* dissemination + composer */}
        <Panel title="Warning dissemination" icon="broadcast" sub="Pillar 4" pad={false}>
          <div className="ews-tabs">
            <button className={"ews-tab " + (tab === "compose" ? "on" : "")} onClick={() => setTab("compose")}>Compose alert</button>
            <button className={"ews-tab " + (tab === "log" ? "on" : "")} onClick={() => setTab("log")}>Recent log</button>
          </div>

          {tab === "compose" ? (
            <div className="composer">
              <div className="comp-field">
                <label>Channels</label>
                <div className="chan-pick">
                  {KAD.CHANNELS.filter((c) => c.status === "active").map((c) => (
                    <button key={c.name} className={"chan-btn " + (chans[c.name.split(" ")[0]] ? "on" : "")}
                      onClick={() => toggle(c.name.split(" ")[0])}>
                      <Icon name={c.icon} size={16} />
                      <div><b>{c.name}</b><i>{c.reach}</i></div>
                      <span className="chan-check">{chans[c.name.split(" ")[0]] && <Icon name="check" size={13} />}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="comp-field">
                <label>Language</label>
                <div className="seg sm">
                  {["Hausa", "English", "Both"].map((l) => (
                    <button key={l} className={"seg-btn " + (lang === l ? "on" : "")} onClick={() => setLang(l)}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="comp-field">
                <label>Message <i className="mono">{msg.length}/160</i></label>
                <textarea value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={320} rows={4} />
              </div>
              <div className="comp-foot">
                <div className="comp-reach"><Icon name="people" size={14} />Est. reach <b>~1.24M recipients</b></div>
                <button className="btn primary" onClick={dispatch}><Icon name="broadcast" size={15} />Dispatch alert</button>
              </div>
            </div>
          ) : (
            <div className="diss-log">
              {SentinelStore.dissView().map((d, i) => (
                <div key={i} className="diss-row">
                  <span className="diss-ch">{d.ch}</span>
                  <div className="diss-main">
                    <div className="diss-msg">{d.msg}</div>
                    <div className="diss-meta"><b>{d.lga}</b> · {d.lang !== "—" ? d.lang + " · " : ""}{d.recipients} · {KAD.ago(d.at)}</div>
                  </div>
                  <Icon name="check" size={14} className="diss-ok" />
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* channels status */}
        <Panel title="Channel network" icon="signal">
          <div className="chan-status">
            {KAD.CHANNELS.map((c) => (
              <div key={c.name} className="chan-stat-row">
                <span className="inc-icon sm" style={{ "--ic": c.status === "active" ? "var(--green)" : "var(--text-mute)" }}>
                  <Icon name={c.icon} size={14} />
                </span>
                <div className="chan-stat-body">
                  <b>{c.name}</b><i>{c.note}</i>
                </div>
                <div className="chan-stat-right">
                  <span className="chan-reach mono">{c.reach}</span>
                  <span className={"chan-badge " + c.status}>{c.status}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

window.EwsView = EwsView;
