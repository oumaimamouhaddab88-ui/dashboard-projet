import { useState, useEffect, useMemo, useRef, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowLeft, FiPrinter, FiAlertTriangle } from 'react-icons/fi'
import { fetchWithAuth } from '../utils/api'
import { useProject } from '../context/ProjectContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'

const DAY_WIDTH = 26 // px par jour à l'écran
const RANGE_PADDING_DAYS = 4
const MAX_SPAN_DAYS = 15 * 365 // garde-fou : jamais plus de ~15 ans affichés, même avec une date corrompue

const PRINT_LABEL_WIDTH = 200 // largeur de la colonne "Tâches" dans le PDF
const PRINT_BUDGET_WIDTH = 1000 // largeur imprimable approx. d'une page A4 paysage (12mm de marge)

const PLANNED_COLOR = '#8b5cf6' // couleur unique pour le planning idéal (violet), distincte des statuts réels

const STATUS_META = {
  done: { color: '#22c55e', label: 'Terminée' },
  'done-late': { color: '#f39c12', label: 'Terminée en retard' },
  overdue: { color: '#e74c3c', label: 'En retard' },
  in_progress: { color: '#3b82f6', label: 'En cours' },
  upcoming: { color: '#9ca3af', label: 'À venir' },
}

const PERIOD_LABELS = {
  all: 'Tout',
  range: 'Par mois (plage)',
  custom: 'Dates précises',
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function diffDays(a, b) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

// Reprend la même logique de statut que Tasks.jsx, enrichie pour distinguer
// "terminé en retard", "en cours" et "à venir".
function getRealStatus(task) {
  const today = new Date()
  const dateDebut = task.dateDebut ? new Date(task.dateDebut) : null
  const dateFin = task.dateFin ? new Date(task.dateFin) : null
  const dateFinReelle = task.dateFinReelle ? new Date(task.dateFinReelle) : null

  if (task.progress === 1) {
    if (dateFinReelle && dateFin && dateFinReelle > dateFin) return 'done-late'
    return 'done'
  }
  if (dateDebut && dateDebut > today) return 'upcoming'
  if (dateFin && dateFin < today) return 'overdue'
  return 'in_progress'
}

function buildGroups(list) {
  const map = new Map()
  list.forEach((t) => {
    const key = t.rubrique || 'Sans rubrique'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(t)
  })
  return Array.from(map.entries()).map(([rubrique, items]) => ({
    rubrique,
    items: items.slice().sort((a, b) => new Date(a.dateDebut) - new Date(b.dateDebut)),
  }))
}

// Une tâche "appartient" à une période si son intervalle (début -> fin prévue/réelle,
// ou aujourd'hui si encore en cours) chevauche la période demandée.
function taskOverlapsPeriod(task, start, end) {
  if (!task.dateDebut) return false
  const spanStart = new Date(task.dateDebut)
  const ends = [task.dateFin, task.dateFinReelle].filter(Boolean).map((d) => new Date(d))
  const spanEnd = ends.length ? new Date(Math.max(...ends.map((d) => d.getTime()))) : new Date()
  return spanStart <= end && spanEnd >= start
}

// Construit l'échelle temporelle (largeur totale, conversion date -> px, graduations mensuelles,
// position de la ligne "aujourd'hui") pour une plage de dates et une largeur de jour données.
function buildScale(range, dayWidth) {
  const { start, end, totalDays } = range
  const timelineWidth = totalDays * dayWidth
  const dateToX = (date) => diffDays(start, new Date(date)) * dayWidth

  const monthTicks = []
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cursor <= end) {
    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    const segmentStart = cursor < start ? start : cursor
    const segmentEnd = nextMonth > end ? end : nextMonth
    const left = dateToX(segmentStart)
    const width = Math.max(dateToX(segmentEnd) - left, 0)
    monthTicks.push({
      key: cursor.toISOString(),
      label: cursor.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
      left,
      width,
    })
    cursor = nextMonth
  }

  const today = new Date()
  const todayX = today >= start && today <= end ? dateToX(today) : null

  return { timelineWidth, dateToX, monthTicks, todayX }
}

function GanttView() {
  const { currentProjectId } = useProject()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('ideal') // 'ideal' | 'reel'
  const [periodFilter, setPeriodFilter] = useState('all') // 'all' | 'range' | 'custom'
  const [fromKey, setFromKey] = useState('')
  const [toKey, setToKey] = useState('')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [popover, setPopover] = useState(null) // { task, x, y }
  const popoverRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopover(null)
      }
    }
    if (popover) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [popover])

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

  useEffect(() => {
    const handleAfterPrint = () => document.body.classList.remove('printing-gantt')
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [])

  // --- Plage complète (toutes les tâches), utilisée telle quelle pour le PDF
  const fullRange = useMemo(() => {
    const dates = []
    tasks.forEach((t) => {
      if (t.dateDebut) dates.push(new Date(t.dateDebut))
      if (t.dateFin) dates.push(new Date(t.dateFin))
      if (t.dateFinReelle) dates.push(new Date(t.dateFinReelle))
    })
    dates.push(new Date())

    // Garde-fou : une date corrompue (typo d'année, champ mal formaté...) ne doit jamais
    // faire exploser la plage calculée et geler l'affichage.
    const validTimes = dates.map((d) => d.getTime()).filter((t) => Number.isFinite(t))

    if (!validTimes.length) {
      const today = new Date()
      return { start: today, end: today, totalDays: 1 }
    }

    let start = new Date(Math.min(...validTimes))
    let end = new Date(Math.max(...validTimes))
    start.setDate(start.getDate() - RANGE_PADDING_DAYS)
    end.setDate(end.getDate() + RANGE_PADDING_DAYS)
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)

    if (diffDays(start, end) > MAX_SPAN_DAYS) {
      end = new Date(start)
      end.setDate(end.getDate() + MAX_SPAN_DAYS)
    }

    return { start, end, totalDays: Math.max(diffDays(start, end), 1) }
  }, [tasks])

  // --- Liste des mois réellement couverts par vos tâches (bornée par fullRange, donc jamais démesurée)
  const monthOptions = useMemo(() => {
    const opts = []
    let cursor = new Date(fullRange.start.getFullYear(), fullRange.start.getMonth(), 1)
    const end = new Date(fullRange.end.getFullYear(), fullRange.end.getMonth(), 1)
    while (cursor <= end) {
      opts.push({
        key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
        year: cursor.getFullYear(),
        month: cursor.getMonth(),
        label: cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      })
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
    return opts
  }, [fullRange])

  const effectiveFromKey = fromKey && monthOptions.some((o) => o.key === fromKey) ? fromKey : monthOptions[0]?.key
  const effectiveToKey =
    toKey && monthOptions.some((o) => o.key === toKey) ? toKey : monthOptions[monthOptions.length - 1]?.key

  // --- Plage à l'écran : réduite si un filtre de période est actif
  const periodBounds = useMemo(() => {
    if (periodFilter === 'range') {
      const fromOpt = monthOptions.find((o) => o.key === effectiveFromKey)
      const toOpt = monthOptions.find((o) => o.key === effectiveToKey)
      if (!fromOpt || !toOpt) return null
      let start = new Date(fromOpt.year, fromOpt.month, 1)
      let end = new Date(toOpt.year, toOpt.month + 1, 0)
      if (start > end) {
        start = new Date(toOpt.year, toOpt.month, 1)
        end = new Date(fromOpt.year, fromOpt.month + 1, 0)
      }
      return { start, end }
    }
    if (periodFilter === 'custom') {
      if (!customStart || !customEnd) return null
      const start = new Date(customStart)
      const end = new Date(customEnd)
      if (start > end) return { start: end, end: start }
      return { start, end }
    }
    return null
  }, [periodFilter, monthOptions, effectiveFromKey, effectiveToKey, customStart, customEnd])

  const screenRange = useMemo(() => {
    if (!periodBounds) return fullRange
    const start = new Date(periodBounds.start)
    const end = new Date(periodBounds.end)
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    return { start, end, totalDays: Math.max(diffDays(start, end), 1) }
  }, [periodBounds, fullRange])

  const screenScale = useMemo(() => buildScale(screenRange, DAY_WIDTH), [screenRange])

  // --- Échelle du PDF : jour compressé pour que toute la période (filtrée) tienne sur la largeur d'une page
  const printDayWidth = useMemo(() => {
    const budget = PRINT_BUDGET_WIDTH - PRINT_LABEL_WIDTH
    const raw = Math.floor(budget / screenRange.totalDays)
    return Math.max(3, Math.min(DAY_WIDTH, raw))
  }, [screenRange])

  const printScale = useMemo(() => buildScale(screenRange, printDayWidth), [screenRange, printDayWidth])

  // --- Tâches affichées à l'écran (filtrées par période) vs. toutes les tâches (PDF)
  const screenTasks = useMemo(() => {
    if (!periodBounds) return tasks
    return tasks.filter((t) => taskOverlapsPeriod(t, periodBounds.start, periodBounds.end))
  }, [tasks, periodBounds])

  const screenGroups = useMemo(() => buildGroups(screenTasks), [screenTasks])

  // Retards (pour le résumé et la vue réelle)
  const overdueCount = useMemo(
    () => tasks.filter((t) => ['overdue', 'done-late'].includes(getRealStatus(t))).length,
    [tasks]
  )

  function getBar(task, scale) {
    if (mode === 'ideal') {
      if (!task.dateDebut || !task.dateFin) return null
      const left = scale.dateToX(task.dateDebut)
      const width = Math.max(scale.dateToX(task.dateFin) - left, 6)
      return {
        left,
        width,
        style: { background: PLANNED_COLOR },
        title: `Planifié : ${formatDate(task.dateDebut)} → ${formatDate(task.dateFin)}`,
      }
    }

    // mode 'reel'
    if (!task.dateDebut) return null
    const status = getRealStatus(task)
    const meta = STATUS_META[status]
    const start = new Date(task.dateDebut)
    let end

    if (status === 'upcoming') {
      end = new Date(start)
      end.setDate(end.getDate() + 1)
    } else if (task.progress === 1) {
      end = task.dateFinReelle ? new Date(task.dateFinReelle) : new Date(task.dateFin)
    } else {
      end = new Date()
    }

    const left = scale.dateToX(start)
    const width = Math.max(scale.dateToX(end) - left, 6)

    let delaySuffix = ''
    if ((status === 'overdue' || status === 'done-late') && task.dateFin) {
      const delayDays = diffDays(new Date(task.dateFin), end)
      if (delayDays > 0) delaySuffix = ` — retard de ${delayDays} jour${delayDays > 1 ? 's' : ''}`
    }

    const ghost = status === 'upcoming'

    return {
      left,
      width,
      style: ghost
        ? { background: 'transparent', border: `2px dashed ${meta.color}` }
        : { background: meta.color },
      title: `${meta.label} : ${formatDate(start)} → ${formatDate(end)}${delaySuffix}`,
    }
  }

  function renderPopoverBody(task) {
    const status = getRealStatus(task)
    const meta = STATUS_META[status]
    const isOngoing = status === 'in_progress' || status === 'overdue'

    const plannedDuration =
      task.dateDebut && task.dateFin ? diffDays(new Date(task.dateDebut), new Date(task.dateFin)) : null

    const realEnd = status === 'done' || status === 'done-late' ? task.dateFinReelle || task.dateFin : new Date()
    const realDuration = task.dateDebut ? diffDays(new Date(task.dateDebut), new Date(realEnd)) : null

    const delayDays =
      (status === 'overdue' || status === 'done-late') && task.dateFin
        ? diffDays(new Date(task.dateFin), new Date(realEnd))
        : 0

    return (
      <>
        <div className="gantt-popover-row">
          <span>Statut</span>
          <strong style={{ color: meta.color }}>{meta.label}</strong>
        </div>
        <div className="gantt-popover-row">
          <span>Début</span>
          <strong>{formatDate(task.dateDebut)}</strong>
        </div>
        <div className="gantt-popover-row">
          <span>Fin prévue</span>
          <strong>{formatDate(task.dateFin)}</strong>
        </div>
        <div className="gantt-popover-row">
          <span>Fin réelle</span>
          <strong>{task.dateFinReelle ? formatDate(task.dateFinReelle) : isOngoing ? 'En cours' : '—'}</strong>
        </div>
        <div className="gantt-popover-row">
          <span>Durée prévue</span>
          <strong>
            {plannedDuration != null ? `${plannedDuration} jour${plannedDuration > 1 ? 's' : ''}` : '—'}
          </strong>
        </div>
        <div className="gantt-popover-row">
          <span>Durée réelle{isOngoing ? ' (en cours)' : ''}</span>
          <strong>{realDuration != null ? `${realDuration} jour${realDuration > 1 ? 's' : ''}` : '—'}</strong>
        </div>
        {delayDays > 0 && (
          <div className="gantt-popover-row gantt-popover-delay">
            <span>Retard</span>
            <strong>
              +{delayDays} jour{delayDays > 1 ? 's' : ''}
            </strong>
          </div>
        )}
      </>
    )
  }

  // --- Rendu écran : une seule grille continue, échelle et tâches filtrées par période
  function renderScreenGrid() {
    const scale = screenScale
    return (
      <div className="gantt-grid" style={{ gridTemplateColumns: `260px ${scale.timelineWidth}px` }}>
        <div className="gantt-label-cell gantt-label-header">Tâches</div>
        <div className="gantt-timeline-header">
          {scale.monthTicks.map((tick) => (
            <div key={tick.key} className="gantt-month-tick" style={{ left: tick.left, width: tick.width }}>
              {tick.label}
            </div>
          ))}
          {scale.todayX !== null && <div className="gantt-today-line" style={{ left: scale.todayX }} />}
        </div>

        {screenGroups.map((group) => (
          <Fragment key={group.rubrique}>
            <div className="gantt-label-cell gantt-rubrique-label">{group.rubrique}</div>
            <div className="gantt-timeline-row gantt-rubrique-band">
              {scale.todayX !== null && <div className="gantt-today-line" style={{ left: scale.todayX }} />}
            </div>

            {group.items.map((task) => {
              const bar = getBar(task, scale)
              return (
                <Fragment key={task._id}>
                  <div className="gantt-label-cell gantt-task-label" title={task.task}>
                    {task.task}
                  </div>
                  <div
                    className="gantt-timeline-row gantt-timeline-row-clickable"
                    title={bar?.title}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      // Centre la popover sur la barre si elle existe, sinon sur le point cliqué
                      const x = bar ? rect.left + bar.left + bar.width / 2 : e.clientX
                      setPopover({ task, mode, x, y: rect.top })
                    }}
                  >
                    {scale.todayX !== null && <div className="gantt-today-line" style={{ left: scale.todayX }} />}
                    {bar && (
                      <div className="gantt-bar" style={{ left: bar.left, width: bar.width, ...bar.style }} />
                    )}
                  </div>
                </Fragment>
              )
            })}
          </Fragment>
        ))}
      </div>
    )
  }

  // --- Tâches pour le PDF (filtrées par période) et groupes associés
  const printTasks = useMemo(() => {
    if (!periodBounds) return tasks
    return tasks.filter((t) => taskOverlapsPeriod(t, periodBounds.start, periodBounds.end))
  }, [tasks, periodBounds])

  const printGroups = useMemo(() => buildGroups(printTasks), [printTasks])

  // --- Rendu PDF : une page indépendante par rubrique, avec sa propre frise (échelle compressée)
  // Reflète le filtre de période actif à l'écran (printGroups / screenRange déjà filtrés).
  function renderPrintPages() {
    const scale = printScale
    const periodLabel =
      periodFilter === 'all'
        ? null
        : `Période : ${formatDate(screenRange.start)} → ${formatDate(screenRange.end)}`

    return printGroups.map((group, idx) => (
      <div key={group.rubrique} className={`print-gantt-container${idx > 0 ? ' gantt-print-page-break' : ''}`}>
        <div className="print-gantt-title">
          Diagramme de Gantt — {mode === 'ideal' ? 'Planning idéal' : 'Réel (exécution)'}
        </div>
        <div className="print-gantt-subtitle">
          {group.rubrique} · Généré le {formatDate(new Date())}
          {periodLabel && <> · {periodLabel}</>}
        </div>
        <div className="gantt-grid" style={{ gridTemplateColumns: `${PRINT_LABEL_WIDTH}px ${scale.timelineWidth}px` }}>
          <div className="gantt-label-cell gantt-label-header">Tâches</div>
          <div className="gantt-timeline-header">
            {scale.monthTicks.map((tick) => (
              <div key={tick.key} className="gantt-month-tick" style={{ left: tick.left, width: tick.width }}>
                {tick.label}
              </div>
            ))}
            {scale.todayX !== null && <div className="gantt-today-line" style={{ left: scale.todayX }} />}
          </div>

          {group.items.map((task) => {
            const bar = getBar(task, scale)
            return (
              <Fragment key={task._id}>
                <div className="gantt-label-cell gantt-task-label">{task.task}</div>
                <div className="gantt-timeline-row">
                  {scale.todayX !== null && <div className="gantt-today-line" style={{ left: scale.todayX }} />}
                  {bar && <div className="gantt-bar" style={{ left: bar.left, width: bar.width, ...bar.style }} />}
                </div>
              </Fragment>
            )
          })}
        </div>
      </div>
    ))
  }

  const handlePrint = () => {
    // Fonction helper pour convertir YYYY-MM-DD en DD/MM/YYYY
    const formatISODate = (isoString) => {
      const [year, month, day] = isoString.split('-')
      return `${day}/${month}/${year}`
    }

    // Génère un nom de fichier significatif avec la période
    let fileName = 'Gantt'
    
    if (periodFilter === 'range') {
      const fromOpt = monthOptions.find((o) => o.key === effectiveFromKey)
      const toOpt = monthOptions.find((o) => o.key === effectiveToKey)
      if (fromOpt && toOpt) {
        const fromStr = `${String(fromOpt.month + 1).padStart(2, '0')}/${fromOpt.year}`
        const toStr = `${String(toOpt.month + 1).padStart(2, '0')}/${toOpt.year}`
        fileName = `Gantt_${fromStr}_a_${toStr}`
      }
    } else if (periodFilter === 'custom') {
      if (customStart && customEnd) {
        const fromStr = formatISODate(customStart)
        const toStr = formatISODate(customEnd)
        fileName = `Gantt_${fromStr}_a_${toStr}`
      }
    } else {
      // periodFilter === 'all'
      const todayStr = new Date().toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }).replace(/\//g, '-') // DD-MM-YYYY avec tirets
      fileName = `Gantt_complet_${todayStr}`
    }
    
    // Change le titre du document (utilisé comme nom du PDF)
    const originalTitle = document.title
    document.title = fileName
    
    // Imprime
    document.body.classList.add('printing-gantt')
    window.print()
    
    // Restaure le titre original après l'impression
    setTimeout(() => {
      document.title = originalTitle
      document.body.classList.remove('printing-gantt')
    }, 100)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <p className="dashboard-loading">Chargement du planning...</p>
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
      <Link to="/tasks" className="tasks-back-link">
        <FiArrowLeft /> Retour aux tâches
      </Link>

      <header className="dashboard-header">
        <div className="dashboard-header-brand">
          <div>
            <h1>Diagramme de Gantt</h1>
            <p>
              {screenTasks.length} tâche(s) affichée(s)
              {overdueCount > 0 && (
                <>
                  {' '}
                  · <FiAlertTriangle style={{ verticalAlign: -2 }} /> {overdueCount} en retard au total
                </>
              )}
            </p>
          </div>
        </div>
        <div className="dashboard-header-actions">
          <button className="dashboard-link-btn" onClick={handlePrint}>
            <FiPrinter /> Imprimer / PDF
          </button>
        </div>
      </header>

      <div className="dashboard-card gantt-card">
        <div className="gantt-wrapper">
          <div className="gantt-toolbar-row">
            <div className="gantt-mode-toggle">
              <button
                className={`gantt-mode-btn ${mode === 'ideal' ? 'active' : ''}`}
                onClick={() => setMode('ideal')}
              >
                Planning idéal
              </button>
              <button
                className={`gantt-mode-btn ${mode === 'reel' ? 'active' : ''}`}
                onClick={() => setMode('reel')}
              >
                Réel (exécution)
              </button>
            </div>

            <div className="gantt-mode-toggle">
              {Object.keys(PERIOD_LABELS).map((key) => (
                <button
                  key={key}
                  className={`gantt-mode-btn ${periodFilter === key ? 'active' : ''}`}
                  onClick={() => setPeriodFilter(key)}
                >
                  {PERIOD_LABELS[key]}
                </button>
              ))}
            </div>

            {periodFilter === 'range' && (
              <div className="gantt-date-range">
                <label>
                  Depuis
                  <select value={effectiveFromKey || ''} onChange={(e) => setFromKey(e.target.value)}>
                    {monthOptions.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Jusqu'à
                  <select value={effectiveToKey || ''} onChange={(e) => setToKey(e.target.value)}>
                    {monthOptions.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {periodFilter === 'custom' && (
              <div className="gantt-date-range">
                <label>
                  Du
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                </label>
                <label>
                  au
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                </label>
              </div>
            )}
          </div>

          {mode === 'ideal' ? (
            <div className="gantt-legend">
              <div className="gantt-legend-item">
                <span className="gantt-legend-dot" style={{ background: PLANNED_COLOR }} />
                Planifié (prévu)
              </div>
              <div className="gantt-legend-item">
                <span className="gantt-legend-today-line" /> Aujourd'hui
              </div>
            </div>
          ) : (
            <div className="gantt-legend">
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <div className="gantt-legend-item" key={key}>
                  <span className="gantt-legend-dot" style={{ background: meta.color }} />
                  {meta.label}
                </div>
              ))}
              <div className="gantt-legend-item">
                <span className="gantt-legend-today-line" /> Aujourd'hui
              </div>
            </div>
          )}

          {screenGroups.length === 0 ? (
            <p className="dashboard-loading">Aucune tâche sur cette période.</p>
          ) : (
            <div className="gantt-scroll-container">{renderScreenGrid()}</div>
          )}
        </div>
      </div>

      {popover && (
        <div ref={popoverRef} className="gantt-popover" style={{ left: popover.x, top: popover.y }}>
          <button className="gantt-popover-close" onClick={() => setPopover(null)} aria-label="Fermer">
            ×
          </button>
          <div className="gantt-popover-title">{popover.task.task}</div>
          {renderPopoverBody(popover.task)}
        </div>
      )}

      {/* Version dédiée à l'impression : une page par rubrique, échelle compressée pour tenir en largeur */}
      <div className="print-only">{renderPrintPages()}</div>
    </DashboardLayout>
  )
}

export default GanttView