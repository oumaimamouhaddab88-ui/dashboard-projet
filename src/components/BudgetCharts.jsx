// BudgetCharts.jsx
// Trois graphiques légers en SVG pur, construits avec les mêmes classes CSS que les
// graphiques existants du dashboard (donut-chart-*, bar-chart-*) pour rester 100% cohérent
// visuellement, sans ajouter de nouvelle dépendance/bibliothèque au projet.

function formatDH(value) {
  return `${Math.round(value).toLocaleString('fr-FR')} DH`
}

// --- Doughnut : Consommé vs Restant ---------------------------------------

export function BudgetDonutChart({ consomme, restant }) {
  const total = consomme + restant
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const consommeRatio = total > 0 ? consomme / total : 0
  const consommeLength = circumference * consommeRatio

  const data = [
    { label: 'Consommé', value: consomme, color: 'var(--ocp-green)' },
    { label: 'Restant', value: restant, color: '#e2e5e8' },
  ]

  return (
    <div className="donut-chart-wrapper">
      <svg viewBox="0 0 180 180" width="180" height="180">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="#f0f1f3" strokeWidth="20" />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="var(--ocp-green)"
          strokeWidth="20"
          strokeDasharray={`${consommeLength} ${circumference - consommeLength}`}
          strokeDashoffset={circumference / 4}
          transform="rotate(-90 90 90)"
          strokeLinecap="round"
        />
        <text x="90" y="85" textAnchor="middle" className="donut-chart-total">
          {total > 0 ? `${Math.round(consommeRatio * 100)}%` : '0%'}
        </text>
        <text x="90" y="105" textAnchor="middle" fontSize="11" fill="var(--text-muted)">
          Avancement
        </text>
      </svg>
      <div className="donut-chart-legend">
        {data.map((d) => (
          <div className="donut-legend-item" key={d.label}>
            <span className="donut-legend-dot" style={{ backgroundColor: d.color }} />
            {d.label}
            <strong>{formatDH(d.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Bar chart : répartition des dépenses (HT consommé) par poste ---------

export function BudgetBarChart({ postes }) {
  // On garde les libellés courts pour l'axe, le détail complet reste dans le title (tooltip natif)
  const items = postes.map((p) => ({
    label: p.designation.length > 14 ? `${p.designation.slice(0, 14)}…` : p.designation,
    fullLabel: p.designation,
    value: p.summary.totalHT,
  }))
  const max = Math.max(...items.map((i) => i.value), 1)
  const chartHeight = 200
  const barWidth = Math.max(24, Math.min(48, 600 / Math.max(items.length, 1)))
  const gap = 12
  const svgWidth = items.length * (barWidth + gap) + gap

  return (
    <div className="bar-chart">
      <svg className="bar-chart-svg" viewBox={`0 0 ${svgWidth} ${chartHeight}`} preserveAspectRatio="xMidYMax meet">
        {items.map((item, i) => {
          const barHeight = (item.value / max) * (chartHeight - 30)
          const x = gap + i * (barWidth + gap)
          const y = chartHeight - barHeight - 20
          return (
            <g key={i}>
              <title>{`${item.fullLabel} — ${formatDH(item.value)}`}</title>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                fill="var(--ocp-green)"
              />
            </g>
          )
        })}
      </svg>
      <div className="bar-chart-labels">
        {items.map((item, i) => (
          <span key={i} className="bar-chart-label" title={item.fullLabel}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// --- Line chart : évolution des attachements (montant HT par date) --------

export function BudgetLineChart({ attachements }) {
  const points = attachements
    .filter((a) => a.date && a.montantHT > 0)
    .map((a) => ({ date: new Date(a.date), value: a.montantHT }))
    .sort((a, b) => a.date - b.date)

  if (points.length === 0) {
    return <p className="dashboard-loading">Aucun attachement réalisé pour le moment.</p>
  }

  const width = 640
  const height = 220
  const paddingLeft = 50
  const paddingBottom = 30
  const paddingTop = 16

  const minDate = points[0].date.getTime()
  const maxDate = points[points.length - 1].date.getTime()
  const dateSpan = Math.max(maxDate - minDate, 1)
  const maxValue = Math.max(...points.map((p) => p.value), 1)

  const toX = (d) => paddingLeft + ((d - minDate) / dateSpan) * (width - paddingLeft - 16)
  const toY = (v) => paddingTop + (1 - v / maxValue) * (height - paddingTop - paddingBottom)

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.date.getTime())} ${toY(p.value)}`)
    .join(' ')

  return (
    <div className="bar-chart">
      <svg className="bar-chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Axe horizontal */}
        <line
          x1={paddingLeft}
          y1={height - paddingBottom}
          x2={width - 8}
          y2={height - paddingBottom}
          stroke="var(--border-color)"
        />
        <path d={pathD} fill="none" stroke="var(--ocp-green)" strokeWidth="2.5" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={toX(p.date.getTime())} cy={toY(p.value)} r="4" fill="var(--ocp-green-dark)" />
            <title>{`${p.date.toLocaleDateString('fr-FR')} — ${formatDH(p.value)}`}</title>
          </g>
        ))}
      </svg>
      <div className="bar-chart-labels">
        {points.map((p, i) => (
          <span key={i} className="bar-chart-label">
            {p.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
          </span>
        ))}
      </div>
    </div>
  )
}
