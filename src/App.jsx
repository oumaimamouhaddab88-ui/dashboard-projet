import { Routes, Route, Navigate } from 'react-router-dom'
import Equipe from './pages/Equipe'
import Login from './pages/Login'
import Signup from './pages/Signup'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import GanttView from './pages/GanttView'
import Calendar from './pages/Calendar'
import Files from './pages/Files'
import Projects from './pages/Projects'
import ProtectedRoute from './components/ProtectedRoute'
import Budget from './pages/Budget'
import AttachementDetailPage from './pages/AttachementDetailPage'
import { ProjectProvider } from './context/ProjectContext'

// Toutes les pages protégées ont maintenant accès à useProject() (currentProject,
// currentProjectId, selectProject, createProject, ...) — voir context/ProjectContext.jsx.
// Rien ne change pour /login, /register, /verify-email qui restent hors de ce contexte.
function Protected({ children }) {
  return (
    <ProtectedRoute>
      <ProjectProvider>{children}</ProjectProvider>
    </ProtectedRoute>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Signup />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route
        path="/dashboard"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/tasks"
        element={
          <Protected>
            <Tasks />
          </Protected>
        }
      />
      <Route
        path="/tasks/gantt"
        element={
          <Protected>
            <GanttView />
          </Protected>
        }
      />
      <Route
        path="/projects"
        element={
          <Protected>
            <Projects />
          </Protected>
        }
      />
      <Route
        path="/calendar"
        element={
          <Protected>
            <Calendar />
          </Protected>
        }
      />
      <Route
        path="/files"
        element={
          <Protected>
            <Files />
          </Protected>
        }
      />
      <Route
        path="/team"
        element={
          <Protected>
            <Equipe />
          </Protected>
        }
      />
      <Route
        path="/budget"
        element={
          <Protected>
            <Budget />
          </Protected>
        }
      />
      <Route
        path="/budget/attachements/:numero"
        element={
          <Protected>
            <AttachementDetailPage />
          </Protected>
        }
      />
    </Routes>
  )
}

export default App
