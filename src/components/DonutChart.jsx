function DonutChart({ segments, size = 160, strokeWidth = 24, showLegend = true }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  let cumulativePercent = 0

  return (
    <div className="donut-chart-wrapper">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f0f1f3"
          strokeWidth={strokeWidth}
        />
        {segments.map((segment, index) => {
          const percent = segment.value / total
          const dashArray = `${percent * circumference} ${circumference}`
          const dashOffset = -cumulativePercent * circumference
          cumulativePercent += percent

          return (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="butt"
            />
          )
        })}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="donut-chart-total"
        >
          {total}
        </text>
      </svg>

      {showLegend && (
        <div className="donut-chart-legend">
          {segments.map((segment, index) => (
            <div key={index} className="donut-legend-item">
              <span className="donut-legend-dot" style={{ backgroundColor: segment.color }}></span>
              {segment.label}
              <strong>{segment.value}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DonutChart
