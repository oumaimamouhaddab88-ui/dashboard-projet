import { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { fetchWithAuth } from '../utils/api'

function toInputDate(date) {
  if (!date) return ''
  return new Date(date).toISOString().slice(0, 10)
}

function TaskCreateModal({ defaultDate, existingRubriques, projectId, onClose, onCreated }) {
  const [form, setForm] = useState({
    rubrique: existingRubriques?.[0] || '',
    task: '',
    responsable: '',
    dateDebut: toInputDate(defaultDate),
    dateFin: toInputDate(defaultDate),
    ponderation: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.rubrique.trim() || !form.task.trim()) {
      setError('La rubrique et le nom de la tâche sont obligatoires')
      return
    }

    if (!projectId) {
      setError("Aucun projet sélectionné — impossible de créer la tâche")
      return
    }

    setSaving(true)

    try {
      const response = await fetchWithAuth('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          rubrique: form.rubrique.trim(),
          task: form.task.trim(),
          responsable: form.responsable.trim() || undefined,
          dateDebut: form.dateDebut || undefined,
          dateFin: form.dateFin || undefined,
          ponderation: form.ponderation === '' ? undefined : Number(form.ponderation),
        }),
      })

      if (!response) return

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Erreur lors de la création')
        setSaving(false)
        return
      }

      onCreated(data)
    } catch (err) {
      setError('Impossible de contacter le serveur')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Planifier une tâche</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fermer">
            <FiX />
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="create-rubrique">Rubrique</label>
            <input
              id="create-rubrique"
              type="text"
              list="rubriques-suggestions"
              value={form.rubrique}
              onChange={(e) => handleChange('rubrique', e.target.value)}
              placeholder="ex: préparation, montage..."
              required
            />
            <datalist id="rubriques-suggestions">
              {(existingRubriques || []).map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label htmlFor="create-task">Nom de la tâche</label>
            <input
              id="create-task"
              type="text"
              value={form.task}
              onChange={(e) => handleChange('task', e.target.value)}
              placeholder="ex: contrôle qualité soudure"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="create-responsable">Responsable</label>
            <input
              id="create-responsable"
              type="text"
              value={form.responsable}
              onChange={(e) => handleChange('responsable', e.target.value)}
              placeholder="ex: CP, SUPERVISEUR OCP..."
            />
          </div>

          <div className="modal-form-row">
            <div className="form-group">
              <label htmlFor="create-date-debut">Date début</label>
              <input
                id="create-date-debut"
                type="date"
                value={form.dateDebut}
                onChange={(e) => handleChange('dateDebut', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="create-date-fin">Date fin prévue</label>
              <input
                id="create-date-fin"
                type="date"
                value={form.dateFin}
                onChange={(e) => handleChange('dateFin', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="create-ponderation">Pondération (0 à 1, optionnel)</label>
            <input
              id="create-ponderation"
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={form.ponderation}
              onChange={(e) => handleChange('ponderation', e.target.value)}
              placeholder="ex: 0.05"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="modal-cancel-btn" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="submit-btn modal-save-btn" disabled={saving}>
              {saving ? 'Création...' : 'Planifier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TaskCreateModal