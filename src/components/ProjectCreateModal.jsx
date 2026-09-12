import { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { useProject } from '../context/ProjectContext.jsx'

const COLORS = ['#00954a', '#2f6fed', '#e67e22', '#9b59b6', '#e74c3c', '#16a085', '#d68910', '#3b82f6']

function ProjectCreateModal({ onClose, onCreated }) {
  const { createProject } = useProject()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Le nom du projet est obligatoire')
      return
    }

    setSaving(true)
    setError('')

    try {
      const project = await createProject({ name, description, color })
      if (project) onCreated(project)
    } catch (err) {
      setError(err.message || 'Erreur lors de la création du projet')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Nouveau projet</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fermer">
            <FiX />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nom du projet (ex : JPH)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <textarea
            placeholder="Description (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          <div className="project-color-picker">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={`project-color-swatch ${color === c ? 'project-color-swatch-selected' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                aria-label={`Couleur ${c}`}
              />
            ))}
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="modal-cancel-btn" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="submit" className="dashboard-link-btn modal-save-btn" disabled={saving}>
              {saving ? 'Création...' : 'Créer le projet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProjectCreateModal
