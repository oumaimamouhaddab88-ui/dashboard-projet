import { useState, useEffect, useMemo } from 'react'
import { FiChevronLeft, FiChevronRight, FiCheckCircle, FiClock, FiAlertTriangle, FiPlus } from 'react-icons/fi'
import { fetchWithAuth } from '../utils/api'
import { useProject } from '../context/ProjectContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import TaskCreateModal from '../components/TaskCreateModal.jsx'

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function getStatus(task) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (task.progress === 1) return 'done'
  if (task.dateFin && new Date(task.dateFin) < today) return 'overdue'
  return 'todo'
}

function sameDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  )
}

function Calendar() {
  const { currentProjectId } = useProject()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [showCreateModal, setShowCreateModal] = useState(false)

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

  const tasksByDay = useMemo(() => {
    const map = {}
    tasks.forEach((t) => {
      if (!t.dateFin) return
      const key = new Date(t.dateFin).toDateString()
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    return map
  }, [tasks])

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)

    let startWeekday = firstDayOfMonth.getDay()
    startWeekday = startWeekday === 0 ? 6 : startWeekday - 1

    const days = []

    for (let i = 0; i < startWeekday; i++) {
      days.push(null)
    }

    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      days.push(new Date(year, month, d))
    }

    while (days.length % 7 !== 0) {
      days.push(null)
    }

    return days
  }, [currentMonth])

  const selectedDayTasks = useMemo(() => {
    return tasksByDay[selectedDate.toDateString()] || []
  }, [tasksByDay, selectedDate])

  const existingRubriques = useMemo(() => {
    return Array.from(new Set(tasks.map((t) => t.rubrique))).sort()
  }, [tasks])

  const handleTaskCreated = (newTask) => {
    setTasks((prev) => [...prev, newTask])
    setShowCreateModal(false)
  }

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const goToToday = () => {
    const now = new Date()
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate(now)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <p className="dashboard-loading">Chargement du calendrier...</p>
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

  const today = new Date()

  return (
    <DashboardLayout>
      <header className="dashboard-header">
        <div className="dashboard-header-brand">
          <div>
            <h1>Calendrier</h1>
            <p>Échéances des tâches par jour</p>
          </div>
        </div>
        <div className="dashboard-header-actions">
          <button className="dashboard-link-btn" onClick={() => setShowCreateModal(true)}>
            <FiPlus /> Planifier une tâche
          </button>
        </div>
      </header>

      <div className="calendar-layout">
        <div className="dashboard-card calendar-card">
          <div className="calendar-toolbar">
            <div className="calendar-month-nav">
              <button className="calendar-nav-btn" onClick={goToPreviousMonth} aria-label="Mois précédent">
                <FiChevronLeft />
              </button>
              <h2 className="calendar-month-title">
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <button className="calendar-nav-btn" onClick={goToNextMonth} aria-label="Mois suivant">
                <FiChevronRight />
              </button>
            </div>
            <button className="calendar-today-btn" onClick={goToToday}>
              Aujourd'hui
            </button>
          </div>

          <div className="calendar-weekdays">
            {WEEKDAYS.map((day) => (
              <span key={day} className="calendar-weekday">
                {day}
              </span>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={index} className="calendar-cell calendar-cell-empty"></div>
              }

              const dayTasks = tasksByDay[date.toDateString()] || []
              const isToday = sameDay(date, today)
              const isSelected = sameDay(date, selectedDate)

              const statusCounts = { done: 0, todo: 0, overdue: 0 }
              dayTasks.forEach((t) => {
                statusCounts[getStatus(t)] += 1
              })

              return (
                <button
                  key={index}
                  className={`calendar-cell ${isToday ? 'calendar-cell-today' : ''} ${
                    isSelected ? 'calendar-cell-selected' : ''
                  }`}
                  onClick={() => setSelectedDate(date)}
                >
                  <span className="calendar-cell-number">{date.getDate()}</span>
                  {dayTasks.length > 0 && (
                    <div className="calendar-cell-dots">
                      {statusCounts.overdue > 0 && <span className="calendar-dot calendar-dot-overdue"></span>}
                      {statusCounts.todo > 0 && <span className="calendar-dot calendar-dot-todo"></span>}
                      {statusCounts.done > 0 && <span className="calendar-dot calendar-dot-done"></span>}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="dashboard-card calendar-side-panel">
          <div className="dashboard-card-header">
            <h2>
              {selectedDate.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h2>
          </div>

          {selectedDayTasks.length === 0 ? (
            <div className="calendar-empty-state-wrapper">
              <p className="calendar-empty-state">Aucune échéance ce jour-là.</p>
              <button className="calendar-add-day-btn" onClick={() => setShowCreateModal(true)}>
                <FiPlus /> Planifier pour ce jour
              </button>
            </div>
          ) : (
            <div className="calendar-task-list">
              {selectedDayTasks.map((task) => {
                const status = getStatus(task)
                return (
                  <div key={task._id} className="calendar-task-item">
                    <div className="calendar-task-item-top">
                      <span className="rubrique-tag">{task.rubrique}</span>
                      {status === 'done' && (
                        <span className="badge badge-done">
                          <FiCheckCircle /> Terminée
                        </span>
                      )}
                      {status === 'overdue' && (
                        <span className="badge badge-overdue">
                          <FiAlertTriangle /> En retard
                        </span>
                      )}
                      {status === 'todo' && (
                        <span className="badge badge-todo">
                          <FiClock /> À faire
                        </span>
                      )}
                    </div>
                    <p className="calendar-task-name">{task.task}</p>
                    <span className="calendar-task-responsable">
                      {task.responsable || 'Non assigné'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <TaskCreateModal
          defaultDate={selectedDate}
          existingRubriques={existingRubriques}
          projectId={currentProjectId}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleTaskCreated}
        />
      )}
    </DashboardLayout>
  )
}

export default Calendar
