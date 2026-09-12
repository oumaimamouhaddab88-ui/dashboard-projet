function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="stat-card" style={{ backgroundColor: color }}>
      <div className="stat-card-icon">
        <Icon />
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  )
}

export default StatCard
