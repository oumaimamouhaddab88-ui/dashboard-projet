import { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { useProject } from '../context/ProjectContext.jsx'

// Couleur fixe attribuée à tous les nouveaux projets (plus de sélecteur — sur
// demande, on garde le formulaire simple : juste nom + description).
const DEFAULT_PROJECT_COLOR = '#00954a'

function ProjectCreateModal({ onClose, onCreated }) {
  const { createProject } = useProject()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
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
      const project = await createProject({ name, description, color: DEFAULT_PROJECT_COLOR })
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
          <label>
            Nom du projet
            <input
              type="text"
              placeholder="ex : JPH"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label>
            Description (optionnel)
            <textarea
              placeholder="ex : Grande révision JPH 2026"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </label>

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