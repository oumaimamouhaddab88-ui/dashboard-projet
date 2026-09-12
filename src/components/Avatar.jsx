const AVATAR_COLORS = ['#00954a', '#007538', '#2f9e5b', '#1b7a44', '#3caf6e']

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function getColorForName(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function Avatar({ name }) {
  return (
    <div className="avatar-circle" style={{ backgroundColor: getColorForName(name || '?') }}>
      {getInitials(name)}
    </div>
  )
}

export default Avatar
