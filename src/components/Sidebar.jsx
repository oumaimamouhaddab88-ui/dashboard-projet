import { NavLink } from 'react-router-dom'
import {
  FiGrid,
  FiFolder,
  FiCheckSquare,
  FiCalendar,
  FiFile,
  FiUsers,
  FiDollarSign,
  FiUser,
} from 'react-icons/fi'
import logoOcp from '../assets/ocplogo.png'

const menuItems = [
  { label: 'Dashboard', icon: FiGrid, path: '/dashboard' },
  { label: 'Projets', icon: FiFolder, path: '/projects' },
  { label: 'Tâches', icon: FiCheckSquare, path: '/tasks' },
  { label: 'Calendrier', icon: FiCalendar, path: '/calendar' },
  { label: 'Fichiers', icon: FiFile, path: '/files' },
  { label: 'Équipe', icon: FiUsers, path: '/team' },
  { label: 'Budget', icon: FiDollarSign, path: '/budget' },
]

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src={logoOcp} alt="Logo OCP" className="sidebar-logo" />
        <span>OCP Group</span>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? 'sidebar-item sidebar-item-active' : 'sidebar-item'
            }
          >
            <item.icon className="sidebar-item-icon" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
