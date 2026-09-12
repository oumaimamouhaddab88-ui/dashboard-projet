import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FiCheckCircle, FiClock, FiAlertTriangle, FiEdit2, FiTrash2, FiBarChart2 } from 'react-icons/fi'
import { fetchWithAuth } from '../utils/api'
import { useProject } from '../context/ProjectContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import TaskEditModal from '../components/TaskEditModal.jsx'
import TaskDocuments from '../components/TaskDocuments.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getStatus(task) {
  const today = new Date()
  if (task.progress === 1) return 'done'
  if (task.dateFin && new Date(task.dateFin) < today) return 'overdue'
  return 'todo'
}

function StatusBadge({ status }) {
  if (status === 'done') {
    return (
      <span className="badge badge-done">
        <FiCheckCircle /> Terminée
      </span>
    )
  }
  if (status === 'overdue') {
    return (
      <span className="badge badge-overdue">
        <FiAlertTriangle /> En retard
      </span>
    )
  }
  return (
    <span className="badge badge-todo">
      <FiClock /> À faire
    </span>
  )
}

function Tasks() {
  const { currentProjectId } = useProject()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rubriqueFilter, setRubriqueFilter] = useState('Toutes')
  const [statusFilter, setStatusFilter] = useState('Tous')
  const [taskFilter, setTaskFilter] = useState('Toutes')
  const [editingTask, setEditingTask] = useState(null)
  const [deletingTask, setDeletingTask] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  const rubriques = useMemo(() => {
    const set = new Set(tasks.map((t) => t.rubrique))
    return ['Toutes', ...Array.from(set)]
  }, [tasks])

  const taskNames = useMemo(() => {
    const set = new Set(tasks.map((t) => t.task))
    return ['Toutes', ...Array.from(set)]
  }, [tasks])

  const filteredTasks = useMemo(() => {
    const base = tasks.filter((t) => {
      const matchesRubrique = rubriqueFilter === 'Toutes' || t.rubrique === rubriqueFilter
      const matchesStatus = statusFilter === 'Tous' || getStatus(t) === statusFilter
      return matchesRubrique && matchesStatus
    })

    if (taskFilter === 'Toutes') return base

    const startIndex = base.findIndex((t) => t.task === taskFilter)
    if (startIndex === -1) return base

    return base.slice(startIndex)
  }, [tasks, rubriqueFilter, statusFilter, taskFilter])

  const handleTaskUpdated = (updatedTask) => {
    setTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)))
  }

  // Mise à jour optimiste de l'effectif pendant la frappe : on met à jour
  // l'affichage tout de suite, sans attendre le serveur.
  const handleEffectifChange = (taskId, value) => {
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, effectif: value } : t))
    )
  }

  // Sauvegarde vers le backend uniquement quand l'utilisateur quitte le champ
  // (onBlur), pour ne pas envoyer une requête à chaque caractère tapé.
  const handleEffectifSave = async (task, rawValue) => {
    const numericValue = rawValue === '' ? null : Number(rawValue)
    if (numericValue !== null && (Number.isNaN(numericValue) || numericValue < 0)) return
    if (numericValue === task.effectif) return

    try {
      const response = await fetchWithAuth(`/tasks/${task._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ effectif: numericValue }),
      })
      if (!response) return

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Erreur lors de la mise à jour de l'effectif")
        return
      }

      handleTaskUpdated(data)
    } catch (err) {
      setError('Impossible de contacter le serveur')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingTask) return
    setIsDeleting(true)

    try {
      const response = await fetchWithAuth(`/tasks/${deletingTask._id}`, {
        method: 'DELETE',
      })

      if (!response) return

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Erreur lors de la suppression')
        setIsDeleting(false)
        setDeletingTask(null)
        return
      }

      setTasks((prev) => prev.filter((t) => t._id !== deletingTask._id))
      setIsDeleting(false)
      setDeletingTask(null)
    } catch (err) {
      setError('Impossible de contacter le serveur')
      setIsDeleting(false)
      setDeletingTask(null)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <p className="dashboard-loading">Chargement des tâches...</p>
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
            <h1>Toutes les tâches</h1>
            <p>{filteredTasks.length} tâche(s) affichée(s) sur {tasks.length}</p>
          </div>
        </div>
        <div className="dashboard-header-actions">
          <Link to="/tasks/gantt" className="dashboard-link-btn">
            <FiBarChart2 /> Voir Gantt
          </Link>
        </div>
      </header>

      <div className="tasks-filters">
        <select
          className="tasks-filter-select"
          value={rubriqueFilter}
          onChange={(e) => setRubriqueFilter(e.target.value)}
        >
          {rubriques.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          className="tasks-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="Tous">Tous les statuts</option>
          <option value="done">Terminées</option>
          <option value="todo">À faire</option>
          <option value="overdue">En retard</option>
        </select>

        <select
          className="tasks-filter-select"
          value={taskFilter}
          onChange={(e) => setTaskFilter(e.target.value)}
        >
          {taskNames.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="dashboard-card tasks-table-card">
        <div className="tasks-table-wrapper">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Rubrique</th>
                <th>Tâche</th>
                <th>Documents</th>
                <th>Responsable</th>
                <th>Début</th>
                <th>Fin prévue</th>
                <th>Fin réelle</th>
                <th>Pondération</th>
                <th>Effectif</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task._id}>
                  <td>
                    <span className="rubrique-tag">{task.rubrique}</span>
                  </td>
                  <td
                    className="tasks-table-name"
                    title={task.task}
                    style={{ whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: 240, lineHeight: 1.4 }}
                  >
                    {task.task}
                  </td>
                  <td>
                    <TaskDocuments task={task} onUpdated={handleTaskUpdated} />
                  </td>
                  <td>{task.responsable || '—'}</td>
                  <td>{formatDate(task.dateDebut)}</td>
                  <td>{formatDate(task.dateFin)}</td>
                  <td>{formatDate(task.dateFinReelle)}</td>
                  <td>{task.ponderation != null ? `${(task.ponderation * 100).toFixed(0)}%` : '—'}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      className="tasks-effectif-input"
                      value={task.effectif ?? ''}
                      placeholder="—"
                      onChange={(e) => handleEffectifChange(task._id, e.target.value === '' ? '' : Number(e.target.value))}
                      onBlur={(e) => handleEffectifSave(task, e.target.value)}
                      style={{ width: 64 }}
                      aria-label="Effectif"
                    />
                  </td>
                  <td>
                    <StatusBadge status={getStatus(task)} />
                  </td>
                  <td>
                    <div className="tasks-table-actions">
                      <button
                        className="tasks-table-edit-btn"
                        onClick={() => setEditingTask(task)}
                        aria-label="Modifier la tâche"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        className="tasks-table-delete-btn"
                        onClick={() => setDeletingTask(task)}
                        aria-label="Supprimer la tâche"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={(updated) => {
            handleTaskUpdated(updated)
            setEditingTask(null)
          }}
        />
      )}

      {deletingTask && (
        <ConfirmDialog
          title="Supprimer cette tâche ?"
          message={`Cette action est irréversible. La tâche "${deletingTask.task}" ainsi que tous ses documents attachés seront définitivement supprimés.`}
          confirmLabel="Supprimer"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingTask(null)}
          loading={isDeleting}
        />
      )}
    </DashboardLayout>
  )
}

export default Tasks