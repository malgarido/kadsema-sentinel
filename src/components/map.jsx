/* ============================================================
   KADSEMA SENTINEL — Stylized Kaduna State map (SVG)
   ============================================================ */
const { useState: useStateMap } = React;

function KadunaMap({
  metric = "risk",          // risk | hazardScore | exposureScore | vulnScore
  selected = null,
  onSelect = () => {},
  showRivers = true,
  showHotspots = true,
  incidents = null,         // optional array to plot
  compact = false,
  labels = true,
}) {
  const [hover, setHover] = useStateMap(null);
  const lgas = KAD.LGAS;

  function valOf(l) { return l[metric] != null ? l[metric] : l.risk; }

  return (
    <div className={"kmap " + (compact ? "kmap-compact" : "")}>
      <svg viewBox={`0 0 ${KAD.VB_W} ${KAD.VB_H}`} className="kmap-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="kmap-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="rgba(232,178,58,0.05)" strokeWidth="1" />
          </pattern>
          <filter id="hotglow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width={KAD.VB_W} height={KAD.VB_H} fill="url(#kmap-grid)" />

        {/* LGA cells */}
        {lgas.map((l) => {
          const isSel = selected === l.name;
          const isHov = hover === l.name;
          const c = KAD.riskColor(valOf(l));
          return (
            <path key={l.id} d={l.path}
              fill={c}
              fillOpacity={isSel ? 0.95 : isHov ? 0.85 : 0.6}
              stroke={isSel ? "var(--gold)" : "rgba(8,7,5,0.7)"}
              strokeWidth={isSel ? 3 : 1.3}
              className="kmap-cell"
              onMouseEnter={() => setHover(l.name)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect(l.name)}
            />
          );
        })}

        {/* rivers */}
        {showRivers && KAD.RIVERS.map((r, i) => (
          <path key={i} d={r.d} fill="none" stroke="#5b86b3" strokeOpacity="0.85"
            strokeWidth={i === 0 ? 6 : 4} strokeLinecap="round" className="kmap-river" />
        ))}

        {/* labels */}
        {labels && lgas.map((l) => (
          <text key={"t" + l.id} x={l.center.x} y={l.center.y}
            className={"kmap-label " + (selected === l.name || hover === l.name ? "on" : "")}
            textAnchor="middle">{l.name}</text>
        ))}

        {/* incident markers */}
        {incidents && incidents.map((inc, i) => {
          const l = KAD.lgaByName[inc.lga];
          if (!l) return null;
          const ox = ((i % 3) - 1) * 16, oy = (Math.floor(i / 3) % 2 ? 14 : -14);
          const col = inc.sev === 3 ? "var(--red)" : inc.sev === 2 ? "var(--orange)" : "var(--gold)";
          return (
            <g key={inc.id} transform={`translate(${l.center.x + ox} ${l.center.y + oy})`}>
              <circle r="7" fill={col} stroke="#0c0a07" strokeWidth="2" />
            </g>
          );
        })}

        {/* hotspots */}
        {showHotspots && !incidents && KAD.HOTSPOTS.map((h, i) => (
          <g key={i} transform={`translate(${h.x} ${h.y})`} filter="url(#hotglow)">
            <circle r="6" fill="var(--red)" stroke="#fff" strokeOpacity="0.5" strokeWidth="1" />
            <circle r="6" fill="none" stroke="var(--red)" strokeWidth="2" className="hot-ping" />
          </g>
        ))}
      </svg>

      {/* legend */}
      {!compact && (
        <div className="kmap-legend">
          <span className="kmap-legend-label">{
            { risk: "Composite risk", hazardScore: "Hazard", exposureScore: "Exposure", vulnScore: "Vulnerability" }[metric]
          }</span>
          <div className="kmap-ramp">
            <span className="kmap-ramp-bar" />
            <div className="kmap-ramp-ticks"><span>Low</span><span>Moderate</span><span>High</span><span>Extreme</span></div>
          </div>
        </div>
      )}

      {/* hover tooltip */}
      {hover && (() => {
        const l = KAD.lgaByName[hover];
        return (
          <div className="kmap-tip">
            <div className="kmap-tip-name">{l.name} <span>LGA</span></div>
            <div className="kmap-tip-row"><span>Composite risk</span><b style={{ color: KAD.riskColor(l.risk) }}>{l.band}</b></div>
            <div className="kmap-tip-row"><span>Population</span><b>{l.pop}k</b></div>
            <div className="kmap-tip-row"><span>Dominant hazard</span><b>{KAD.lgaByName[hover].zone === "West" ? "Conflict" : l.hazardScore > 0.6 ? "Flood" : "Mixed"}</b></div>
          </div>
        );
      })()}
    </div>
  );
}

window.KadunaMap = KadunaMap;
