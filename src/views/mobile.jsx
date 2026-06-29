/* ============================================================
   KADSEMA SENTINEL — Field App (mobile companion)
   ============================================================ */
const { useState: useStateField } = React;

function Phone({ label, sub, children, statusColor = "var(--green)" }) {
  return (
    <div className="phone-wrap">
      <div className="phone">
        <div className="phone-notch" />
        <div className="phone-screen">
          <div className="ph-status mono">
            <span>9:41</span>
            <span className="ph-status-r"><span className="ph-sig" style={{ background: statusColor }} />4G</span>
          </div>
          {children}
        </div>
      </div>
      <div className="phone-label"><b>{label}</b><i>{sub}</i></div>
    </div>
  );
}

function HazPick() {
  const [sel, setSel] = useStateField("Flood");
  const [sev, setSev] = useStateField(3);
  const [submitted, setSubmitted] = useStateField(false);
  const haz = [["Flood", "flood"], ["Fire", "fire"], ["Conflict", "conflict"], ["Epidemic", "health"], ["Collapse", "collapse"], ["Accident", "rta"]];

  function submit() {
    const icon = haz.find(([n]) => n === sel)?.[1] || "incidents";
    SentinelStore.addIncident({ type: sel, icon, lga: "Igabi", ward: "Rigachikun", sev, channel: "Field App", desc: sel + " incident reported from field via mobile companion. GPS: 10.6731, 7.4012." });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <div className="ph-app">
      <div className="ph-head">
        <div><div className="ph-eyebrow">FIELD REPORT</div><div className="ph-title">New incident</div></div>
        <span className="ph-av">AM</span>
      </div>
      <div className="ph-field"><label>Hazard type</label>
        <div className="haz-grid">
          {haz.map(([n, ic]) => (
            <button key={n} className={"haz-cell " + (sel === n ? "on" : "")} onClick={() => setSel(n)}>
              <Icon name={ic} size={20} /><span>{n}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="ph-field"><label>Location</label>
        <div className="ph-gps"><Icon name="pin" size={15} /><div><b>Rigachikun, Igabi</b><i className="mono">10.6731, 7.4012 · GPS locked</i></div><span className="gps-live">●</span></div>
      </div>
      <div className="ph-field"><label>Severity</label>
        <div className="ph-sev">
          {[1, 2, 3].map((s) => (
            <button key={s} className={"phsev l" + s + (sev === s ? " on" : "")} onClick={() => setSev(s)}>L{s}</button>
          ))}
        </div>
      </div>
      <div className="ph-field"><label>Add photo</label>
        <div className="ph-photo"><Icon name="eye" size={18} />Tap to capture evidence</div>
      </div>
      <button className="ph-submit" onClick={submit} style={submitted ? { background: "var(--green)", color: "#fff" } : {}}>
        <Icon name={submitted ? "check" : "up"} size={16} />{submitted ? "Submitted!" : "Submit report"}
      </button>
      <div className="ph-hint">Works offline · syncs when connected</div>
    </div>
  );
}

function Assignments() {
  const tasks = [
    { t: "Validate flood report", l: "Rigachikun, Igabi", id: "INC-2061", s: "Action now", c: "var(--red)" },
    { t: "Rapid needs assessment", l: "Geshere, Kauru", id: "INC-2055", s: "In progress", c: "var(--orange)" },
    { t: "Confirm siren test", l: "Turunku ward", id: "TSK-118", s: "Today", c: "var(--gold)" },
    { t: "Submit damage photos", l: "Barnawa drainage", id: "INC-2057", s: "Done", c: "var(--green)" },
  ];
  return (
    <div className="ph-app">
      <div className="ph-head">
        <div><div className="ph-eyebrow">DESK OFFICER · IGABI</div><div className="ph-title">My tasks</div></div>
        <span className="ph-badge">3</span>
      </div>
      <div className="ph-tasks">
        {tasks.map((k) => (
          <div key={k.id} className="ph-task" style={{ "--tc": k.c }}>
            <div className="ph-task-main"><b>{k.t}</b><i><Icon name="pin" size={11} />{k.l}</i></div>
            <div className="ph-task-r"><span className="ph-task-s" style={{ color: k.c }}>{k.s}</span><span className="mono ph-task-id">{k.id}</span></div>
          </div>
        ))}
      </div>
      <div className="ph-sla"><Icon name="clock" size={14} /><div><b>SLA reminder</b><i>Validate within 15 min of report</i></div></div>
    </div>
  );
}

function FieldAlerts() {
  const alerts = [
    { t: "FLOOD — DANGER", m: "River Kaduna above danger mark. Move to higher ground now.", ha: "Ruwan kogi ya yi yawa. Ku tashi zuwa tudu yanzu.", c: "var(--red)", at: "2 min ago", ic: "flood" },
    { t: "DISPLACEMENT", m: "IDP support mobilising — Birnin Gwari corridor.", c: "var(--orange)", at: "40 min ago", ic: "conflict" },
    { t: "WEATHER WATCH", m: "Heavy rainfall expected next 24h across Central zone.", c: "var(--gold)", at: "1h ago", ic: "broadcast" },
  ];
  return (
    <div className="ph-app">
      <div className="ph-head">
        <div><div className="ph-eyebrow">WARNINGS RECEIVED</div><div className="ph-title">Alerts</div></div>
        <Icon name="bell" size={18} />
      </div>
      <div className="ph-alerts">
        {alerts.map((a, i) => (
          <div key={i} className="ph-alert" style={{ "--ac": a.c }}>
            <div className="ph-alert-top"><span className="ph-alert-ic"><Icon name={a.ic} size={15} /></span><b>{a.t}</b><span className="mono ph-alert-at">{a.at}</span></div>
            <div className="ph-alert-msg">{a.m}</div>
            {a.ha && <div className="ph-alert-ha">{a.ha}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldView() {
  return (
    <div className="view field-view">
      <div className="field-intro">
        <p>The field companion lets <b>LGA desk officers, volunteers and ward committees</b> report incidents with geolocation, receive role-based tasks, and get warnings in Hausa &amp; English — the first and last mile of the response chain. Built offline-first for low-connectivity LGAs.</p>
      </div>
      <div className="phone-stage">
        <Phone label="Incident reporting" sub="Community / field officer"><HazPick /></Phone>
        <Phone label="Task assignments" sub="LGA desk officer" statusColor="var(--orange)"><Assignments /></Phone>
        <Phone label="Warnings received" sub="Citizen / volunteer" statusColor="var(--red)"><FieldAlerts /></Phone>
      </div>
    </div>
  );
}

window.FieldView = FieldView;
