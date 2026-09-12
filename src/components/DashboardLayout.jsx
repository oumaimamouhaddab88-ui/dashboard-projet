import Sidebar from './Sidebar.jsx'

function DashboardLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-content">{children}</main>
    </div>
  )
}

export default DashboardLayout
