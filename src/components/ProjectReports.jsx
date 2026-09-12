import { useState, useEffect } from 'react'
import { FiFileText, FiPlus, FiTrash2, FiX, FiPaperclip, FiDownload } from 'react-icons/fi'
import { fetchWithAuth } from '../utils/api'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Rapports généraux d'avancement du projet (indépendants des tâches / documents).
// Backend :
//   GET    /api/reports?projectId=...          -> liste des rapports de CE projet
//   POST   /api/reports                        multipart: projectId, description, date, file? -> rapport créé
//   DELETE /api/reports/:reportId               -> suppression
function ProjectReports({ projectId }) {
  const [rapports, setRapports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!projectId) return

    const loadRapports = async () => {
      setLoading(true)
      try {
        const response = await fetchWithAuth(`/reports?projectId=${projectId}`)
        if (!response) return

        const data = await response.json()

        if (!response.ok) {
          setError(data.message || 'Erreur lors du chargement des rapports')
          setLoading(false)
          return
        }

        setRapports(data)
        setLoading(false)
      } catch (err) {
        setError('Impossible de contacter le serveur')
        setLoading(false)
      }
    }

    loadRapports()
  }, [projectId])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!description.trim() || !date || !projectId) return

    setSaving(true)
    setFormError('')

    try {
      const formData = new FormData()
      formData.append('projectId', projectId)
      formData.append('description', description.trim())
      formData.append('date', date)
      if (file) {
        formData.append('file', file)
      }

      const response = await fetchWithAuth('/reports', {
        method: 'POST',
        body: formData,
      })

      if (!response) return

      const data = await response.json()

      if (!response.ok) {
        setFormError(data.message || "Erreur lors de l'ajout du rapport")
        setSaving(false)
        return
      }

      setRapports((prev) => [data, ...prev])
      setDescription('')
      setDate('')
      setFile(null)
      setShowForm(false)
      setSaving(false)
    } catch (err) {
      setFormError('Impossible de contacter le serveur')
      setSaving(false)
    }
  }

  const handleRemove = async (rapportId) => {
    try {
      const response = await fetchWithAuth(`/reports/${rapportId}`, {
        method: 'DELETE',
      })

      if (!response) return

      if (response.ok) {
        setRapports((prev) => prev.filter((r) => r._id !== rapportId))
      }
    } catch (err) {
      // Erreur réseau : la liste reste inchangée plutôt que de casser l'affichage.
    }
  }

  return (
    <div className="dashboard-card project-reports-card">
      <div className="dashboard-card-header">
        <h2>Rapports d'avancement du projet</h2>
        <button
          type="button"
          className="dashboard-link-btn project-reports-add-btn"
          onClick={() => setShowForm((v) => !v)}
          disabled={!projectId}
        >
          {showForm ? <FiX /> : <FiPlus />} {showForm ? 'Annuler' : 'Ajouter un rapport'}
        </button>
      </div>

      {showForm && (
        <form className="project-report-form" onSubmit={handleAdd}>
          <input
            type="text"
            placeholder="Description du rapport"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <label className="project-report-file-label">
            <FiPaperclip />
            {file ? file.name : 'Joindre un fichier (optionnel)'}
            <input
              type="file"
              className="project-report-file-input"
              onChange={(e) => setFile(e.target.files[0] || null)}
            />
          </label>
          <button type="submit" className="project-report-submit-btn" disabled={saving}>
            {saving ? '...' : 'Enregistrer'}
          </button>
          {formError && <span className="task-report-error">{formError}</span>}
        </form>
      )}

      {loading ? (
        <p className="dashboard-loading">Chargement des rapports...</p>
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : rapports.length === 0 ? (
        <p className="dashboard-loading">Aucun rapport pour le moment.</p>
      ) : (
        <div className="project-reports-list">
          {rapports.map((r) => (
            <div key={r._id} className="project-report-row">
              <FiFileText className="report-icon" />
              <div className="project-report-info">
                <span className="task-report-description">{r.description}</span>
                <span className="task-report-date">{formatDate(r.date)}</span>
              </div>
              {r.file?.path && (
  <a
    href={r.file.path}
    target="_blank"
    rel="noopener noreferrer"
    className="project-report-file-link"
    title={r.file.originalName}
  >
    <FiDownload />
  </a>
)}
              <button
                type="button"
                className="task-report-remove"
                onClick={() => handleRemove(r._id)}
                aria-label="Supprimer le rapport"
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProjectReports