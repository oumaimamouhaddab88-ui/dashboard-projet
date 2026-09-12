import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FiCheckCircle, FiClock, FiAlertTriangle, FiList, FiLogOut, FiFolder } from 'react-icons/fi'
import { fetchWithAuth, getUser, logout } from '../utils/api'
import { useProject } from '../context/ProjectContext.jsx'
import StatCard from '../components/StatCard.jsx'
import DonutChart from '../components/DonutChart.jsx'
import BarChart from '../components/BarChart.jsx'
import Avatar from '../components/Avatar.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'

function Dashboard() {
  const { currentProject, currentProjectId } = useProject()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const user = getUser()

  useEffect(() => {
    if (!currentProjectId) return

    const loadTasks = async () => {
      setLoading(true)
      try {
        const response = await fetchWithAuth(`/tasks?projectId=${currentProjectId}`)
        if (!response) return

        const data = await response.json()

        if (!response.ok) {
          setError(data.message || 'Erreur lors du chargement des tâches')
          setLoading(false)
          return
        }

        setTasks(data)
        setLoading(false)
      } catch (err) {
        setError('Impossible de contacter le serveur')
        setLoading(false)
      }
    }

    loadTasks()
  }, [currentProjectId])

  const stats = useMemo(() => {
    const today = new Date()

    const completed = tasks.filter((t) => t.progress === 1)
    const overdue = tasks.filter(
      (t) => t.progress === 0 && t.dateFin && new Date(t.dateFin) < today
    )
    const todo = tasks.filter(
      (t) => t.progress === 0 && (!t.dateFin || new Date(t.dateFin) >= today)
    )

    const rubriquesMap = {}
    tasks.forEach((t) => {
      if (!rubriquesMap[t.rubrique]) {
        rubriquesMap[t.rubrique] = {
          total: 0,
          done: 0,
          todo: 0,
          overdue: 0,
          weightSum: 0,
          weightedProgress: 0,
        }
      }
      const r = rubriquesMap[t.rubrique]
      r.total += 1
      if (t.progress === 1) {
        r.done += 1
      } else if (t.dateFin && new Date(t.dateFin) < today) {
        r.overdue += 1
      } else {
        r.todo += 1
      }
      const weight = t.ponderation || 0
      r.weightSum += weight
      r.weightedProgress += weight * t.progress
    })

    const rubriques = Object.entries(rubriquesMap).map(([name, r]) => ({
      name,
      total: r.total,
      done: r.done,
      todo: r.todo,
      overdue: r.overdue,
      percent: r.weightSum > 0 ? Math.round((r.weightedProgress / r.weightSum) * 100) : 0,
    }))

    const responsableMap = {}
    tasks.forEach((t) => {
      const resp = t.responsable || 'Non assigné'
      if (!responsableMap[resp]) {
        responsableMap[resp] = { todo: 0, done: 0, overdue: 0 }
      }
      if (t.progress === 1) {
        responsableMap[resp].done += 1
      } else if (t.dateFin && new Date(t.dateFin) < today) {
        responsableMap[resp].overdue += 1
      } else {
        responsableMap[resp].todo += 1
      }
    })

    const team = Object.entries(responsableMap).map(([name, counts]) => ({
      name,
      ...counts,
      total: counts.todo + counts.done + counts.overdue,
    }))

    return {
      total: tasks.length,
      completed: completed.length,
      todo: todo.length,
      overdue: overdue.length,
      rubriques,
      team,
    }
  }, [tasks])

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <DashboardLayout>
        <p className="dashboard-loading">Chargement du dashboard...</p>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <p className="form-error">{error}</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <header className="dashboard-header">
        <div className="dashboard-header-brand">
          {currentProject && (
            <div className="dashboard-header-project-switcher">
              <FiFolder />
              <span>{currentProject.name}</span>
              <Link to="/projects" className="dashboard-card-link">
                Changer de projet
              </Link>
            </div>
          )}
        </div>
        <div className="dashboard-header-actions">
          {user && <span className="dashboard-user">{user.fullName}</span>}
         
          <button className="dashboard-logout-btn" onClick={handleLogout}>
            <FiLogOut /> Déconnexion
          </button>
        </div>
      </header>

      <div className="stat-cards-grid">
        <StatCard icon={FiFolder} label="Rubriques actives" value={stats.rubriques.length} color="#007538" />
        <StatCard icon={FiCheckCircle} label="Tâches terminées" value={stats.completed} color="#22c55e" />
        <StatCard icon={FiClock} label="Tâches en attente" value={stats.todo} color="#f5a623" />
        <StatCard icon={FiAlertTriangle} label="Tâches en retard" value={stats.overdue} color="#e74c3c" />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h2>Aperçu des rubriques</h2>
            <Link to="/tasks" className="dashboard-card-link">
              Voir toutes les tâches →
            </Link>
          </div>
          <div className="rubrique-overview-grid">
            {stats.rubriques.map((r) => (
              <div key={r.name} className="rubrique-overview-item">
                <span className="rubrique-name">{r.name}</span>
                <span className="rubrique-overview-percent">{r.percent}% terminé</span>
                <div className="rubrique-progress-bar">
                  <div
                    className="rubrique-progress-fill"
                    style={{ width: `${r.percent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h2>Aperçu des tâches</h2>
          </div>
          <div className="tasks-overview-layout">
            <div className="tasks-overview-legend">
              <div className="tasks-overview-total">
                <span className="tasks-overview-total-value">{stats.total}</span>
                <span className="tasks-overview-total-label">Tâches assignées</span>
              </div>
              <div className="donut-legend-item">
                <span className="donut-legend-dot" style={{ backgroundColor: '#f5a623' }}></span>
                À faire
                <strong>{stats.todo}</strong>
              </div>
              <div className="donut-legend-item">
                <span className="donut-legend-dot" style={{ backgroundColor: '#22c55e' }}></span>
                Terminées
                <strong>{stats.completed}</strong>
              </div>
              <div className="donut-legend-item">
                <span className="donut-legend-dot" style={{ backgroundColor: '#e74c3c' }}></span>
                En retard
                <strong>{stats.overdue}</strong>
              </div>
            </div>
            <DonutChart
              segments={[
                { label: 'Terminées', value: stats.completed, color: '#22c55e' },
                { label: 'À faire', value: stats.todo, color: '#f5a623' },
                { label: 'En retard', value: stats.overdue, color: '#e74c3c' },
              ]}
              showLegend={false}
            />
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h2>Charge par responsable</h2>
          </div>
          <div className="team-workload-list">
            {stats.team.map((member) => (
              <div key={member.name} className="team-workload-item">
                <div className="team-workload-identity">
                  <Avatar name={member.name} />
                  <span className="team-workload-name">{member.name}</span>
                </div>
                <div className="team-workload-badges">
                  <span className="badge badge-todo">{member.todo} à faire</span>
                  <span className="badge badge-done">{member.done} terminées</span>
                  {member.overdue > 0 && (
                    <span className="badge badge-overdue">{member.overdue} en retard</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h2>Avancement par rubrique</h2>
          </div>
          <BarChart
            data={stats.rubriques.map((r) => ({ label: r.name, todo: r.todo, done: r.done, overdue: r.overdue }))}
            series={[
              { key: 'todo', label: 'À faire', color: '#f5a623' },
              { key: 'done', label: 'Terminées', color: '#22c55e' },
              { key: 'overdue', label: 'En retard', color: '#e74c3c' },
            ]}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}

export default Dashboard
