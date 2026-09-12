function BarChart({ data, series, height = 220 }) {
  const maxValue = Math.max(
    1,
    ...data.map((d) => series.reduce((sum, s) => sum + (d[s.key] || 0), 0))
  )
  const barGroupWidth = 100 / data.length
  const barWidth = barGroupWidth / (series.length + 1)

  return (
    <div className="bar-chart">
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="bar-chart-svg">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <line
            key={tick}
            x1="0"
            x2="100"
            y1={height - height * 0.15 - tick * (height * 0.75)}
            y2={height - height * 0.15 - tick * (height * 0.75)}
            stroke="#eef0f2"
            strokeWidth="0.5"
          />
        ))}

        {data.map((d, groupIndex) =>
          series.map((s, seriesIndex) => {
            const value = d[s.key] || 0
            const barHeight = (value / maxValue) * (height * 0.75)
            const x =
              groupIndex * barGroupWidth + barWidth * (seriesIndex + 0.5)
            const y = height - height * 0.15 - barHeight

            return (
              <rect
                key={s.key}
                x={x}
                y={y}
                width={barWidth * 0.8}
                height={barHeight}
                fill={s.color}
                rx="1"
              />
            )
          })
        )}
      </svg>

      <div className="bar-chart-labels">
        {data.map((d) => (
          <span key={d.label} className="bar-chart-label">
            {d.label}
          </span>
        ))}
      </div>

      <div className="bar-chart-legend">
        {series.map((s) => (
          <div key={s.key} className="donut-legend-item">
            <span className="donut-legend-dot" style={{ backgroundColor: s.color }}></span>
            {s.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default BarChart
