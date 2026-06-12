/* ============================================================
   KADSEMA SENTINEL — GIS Risk & Hazard Map
   ============================================================ */
const { useState: useStateRisk } = React;

const METRICS = [
  { id: "risk", label: "Composite risk", icon: "target" },
  { id: "hazardScore", label: "Hazard", icon: "flood" },
  { id: "exposureScore", label: "Exposure", icon: "people" },
  { id: "vulnScore", label: "Vulnerability", icon: "shield" },
];

function ScoreBar({ label, v }) {
  return (
    <div className="score">
      <div className="score-top"><span>{label}</span><b className="mono" style={{ color: KAD.riskColor(v) }}>{Math.round(v * 100)}</b></div>
      <Bar value={v} max={1} color={KAD.riskColor(v)} h={5} />
    </div>
  );
}

function RiskMapView({ focus }) {
  const [metric, setMetric] = useStateRisk("risk");
  const [rivers, setRivers] = useStateRisk(true);
  const [hotspots, setHotspots] = useStateRisk(true);
  const [incidents, setIncidents] = useStateRisk(false);
  const [sel, setSel] = useStateRisk(focus || "Igabi");

  const l = KAD.lgaByName[sel];
  const ranked = [...KAD.LGAS].sort((a, b) => b[metric] - a[metric]);
  const active = KAD.INCIDENTS.filter((i) => i.status !== "Closed");

  return (
    <div className="view risk-view">
      {/* left controls */}
      <aside className="risk-rail">
        <div className="rail-block">
          <div className="rail-label">Risk layer</div>
          <div className="layer-list">
            {METRICS.map((m) => (
              <button key={m.id} className={"layer-btn " + (metric === m.id ? "on" : "")} onClick={() => setMetric(m.id)}>
                <Icon name={m.icon} size={16} /><span>{m.label}</span>
                <span className="layer-radio" />
              </button>
            ))}
          </div>
        </div>

        <div className="rail-block">
          <div className="rail-label">Overlays</div>
          <Toggle label="Rivers &amp; drainage" on={rivers} set={setRivers} icon="flood" />
          <Toggle label="Active hotspots" on={hotspots} set={setHotspots} icon="target" />
          <Toggle label="Live incidents" on={incidents} set={setIncidents} icon="incidents" />
        </div>

        <div className="rail-block model">
          <div className="rail-label">Risk model</div>
          <div className="formula">
            <span>Risk</span><i>=</i>
            <span className="f-h">Hazard</span><i>×</i>
            <span className="f-e">Exposure</span><i>×</i>
            <span className="f-v">Vuln.</span>
          </div>
          <p className="model-note">Weighted overlay of rasterised layers, normalised 0–1. Aligned to UNDRR four-pillar EWS framework.</p>
          <div className="model-meta mono">
            <div><span>CRS</span><b>WGS 84 / UTM 32N</b></div>
            <div><span>Cells</span><b>{KAD.LGAS.length} LGA · 248 wards</b></div>
            <div><span>Updated</span><b>{KAD.fmtTime(KAD.mins(12))}</b></div>
          </div>
        </div>
      </aside>

      {/* map */}
      <div className="risk-map-panel">
        <KadunaMap metric={metric} selected={sel} onSelect={setSel}
          showRivers={rivers} showHotspots={hotspots}
          incidents={incidents ? active : null} />
      </div>

      {/* right profile */}
      <aside className="risk-profile">
        <div className="rp-head" style={{ "--rc": KAD.riskColor(l.risk) }}>
          <div className="rp-band">{l.band} risk</div>
          <div className="rp-name">{l.name}</div>
          <div className="rp-zone">{l.zone} zone · {l.wards} wards · {l.pop}k pop.</div>
        </div>

        <div className="rp-scores">
          <ScoreBar label="Hazard" v={l.hazardScore} />
          <ScoreBar label="Exposure" v={l.exposureScore} />
          <ScoreBar label="Vulnerability" v={l.vulnScore} />
          <div className="rp-divider" />
          <ScoreBar label="Composite risk" v={l.risk} />
        </div>

        <div className="rp-section">
          <div className="ds-label">Recommended posture</div>
          <ul className="rp-rec">
            {l.risk >= 0.78 && <li><span className="rec-dot red" />Pre-position relief &amp; activate sirens</li>}
            {l.risk >= 0.6 && <li><span className="rec-dot orange" />Heighten ward-level monitoring</li>}
            {l.hazardScore >= 0.7 && <li><span className="rec-dot orange" />Evacuation route pre-planning</li>}
            <li><span className="rec-dot gold" />Community committee briefing</li>
            <li><span className="rec-dot green" />Quarterly ground-truth validation</li>
          </ul>
        </div>

        <div className="rp-section">
          <div className="ds-label">LGAs ranked · {METRICS.find((m) => m.id === metric).label}</div>
          <div className="rank-list">
            {ranked.slice(0, 8).map((r, i) => (
              <button key={r.id} className={"rank-row " + (r.name === sel ? "on" : "")} onClick={() => setSel(r.name)}>
                <span className="rank-n mono">{String(i + 1).padStart(2, "0")}</span>
                <span className="rank-name">{r.name}</span>
                <span className="rank-bar"><span style={{ width: r[metric] * 100 + "%", background: KAD.riskColor(r[metric]) }} /></span>
                <span className="rank-val mono" style={{ color: KAD.riskColor(r[metric]) }}>{Math.round(r[metric] * 100)}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Toggle({ label, on, set, icon }) {
  return (
    <button className={"toggle " + (on ? "on" : "")} onClick={() => set(!on)}>
      <Icon name={icon} size={15} />
      <span>{label}</span>
      <span className="toggle-sw"><i /></span>
    </button>
  );
}

window.RiskMapView = RiskMapView;
