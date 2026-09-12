import { useState, useEffect, useMemo } from 'react'
import { FiFolder, FiPaperclip, FiChevronDown, FiChevronRight } from 'react-icons/fi'
import { fetchWithAuth } from '../utils/api'
import { useProject } from '../context/ProjectContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import TaskDocuments from '../components/TaskDocuments.jsx'
import ProjectReports from '../components/ProjectReports.jsx'

function Files() {
  const { currentProjectId } = useProject()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [collapsedRubriques, setCollapsedRubriques] = useState({})

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

  const handleTaskUpdated = (updatedTask) => {
    setTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)))
  }

  // Seules les tâches possédant au moins un document sont prises en compte sur cette page.
  const tasksWithDocs = useMemo(
    () => tasks.filter((t) => (t.documents || []).length > 0),
    [tasks]
  )

  const rubriqueGroups = useMemo(() => {
    const map = {}

    tasksWithDocs.forEach((t) => {
      if (!map[t.rubrique]) {
        map[t.rubrique] = { tasks: [], documentCount: 0 }
      }
      map[t.rubrique].tasks.push(t)
      map[t.rubrique].documentCount += (t.documents || []).length
    })

    return Object.entries(map)
      .map(([name, group]) => ({ name, ...group }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [tasksWithDocs])

  const totalDocuments = useMemo(
    () => tasksWithDocs.reduce((sum, t) => sum + (t.documents || []).length, 0),
    [tasksWithDocs]
  )

  const toggleRubrique = (name) => {
    setCollapsedRubriques((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  if (loading) {
    return (
      <DashboardLayout>
        <p className="dashboard-loading">Chargement des fichiers...</p>
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
          <div>
            <h1>Fichiers</h1>
            <p>
              {totalDocuments} document{totalDocuments !== 1 ? 's' : ''} réparti
              {totalDocuments !== 1 ? 's' : ''} sur {rubriqueGroups.length} rubrique
              {rubriqueGroups.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </header>

      <ProjectReports projectId={currentProjectId} />

      {rubriqueGroups.length === 0 ? (
        <div className="dashboard-card">
          <p className="dashboard-loading">Aucune tâche ne possède de document pour le moment.</p>
        </div>
      ) : (
      <div className="files-rubrique-list">
        {rubriqueGroups.map((group) => {
          const isCollapsed = collapsedRubriques[group.name]
          const visibleTasks = group.tasks

          return (
            <div key={group.name} className="dashboard-card files-rubrique-card">
              <button
                className="files-rubrique-header"
                onClick={() => toggleRubrique(group.name)}
              >
                <div className="files-rubrique-header-left">
                  {isCollapsed ? <FiChevronRight /> : <FiChevronDown />}
                  <FiFolder className="files-rubrique-icon" />
                  <span className="files-rubrique-name">{group.name}</span>
                </div>
                <span className="files-rubrique-count">
                  <FiPaperclip /> {group.documentCount} document{group.documentCount !== 1 ? 's' : ''}
                </span>
              </button>

              {!isCollapsed && (
                <div className="files-task-list">
                  {visibleTasks.map((task) => (
                    <div key={task._id} className="files-task-row">
                      <span className="files-task-name">{task.task}</span>
                      <TaskDocuments task={task} onUpdated={handleTaskUpdated} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      )}
    </DashboardLayout>
  )
}

export default Files
