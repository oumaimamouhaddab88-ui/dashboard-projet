import { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { fetchWithAuth } from '../utils/api'

function toInputDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toISOString().slice(0, 10)
}

function TaskEditModal({ task, onClose, onSaved }) {
  const [form, setForm] = useState({
    rubrique: task.rubrique || '',
    task: task.task || '',
    responsable: task.responsable || '',
    dateDebut: toInputDate(task.dateDebut),
    dateFin: toInputDate(task.dateFin),
    dateFinReelle: toInputDate(task.dateFinReelle),
    ponderation: task.ponderation != null ? task.ponderation : '',
    progress: task.progress,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const response = await fetchWithAuth(`/tasks/${task._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          rubrique: form.rubrique,
          task: form.task,
          responsable: form.responsable,
          dateDebut: form.dateDebut || null,
          dateFin: form.dateFin || null,
          dateFinReelle: form.dateFinReelle || null,
          ponderation: form.ponderation === '' ? null : Number(form.ponderation),
          progress: Number(form.progress),
        }),
      })

      if (!response) return

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Erreur lors de la mise à jour')
        setSaving(false)
        return
      }

      onSaved(data)
    } catch (err) {
      setError('Impossible de contacter le serveur')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Modifier la tâche</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fermer">
            <FiX />
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="edit-rubrique">Rubrique</label>
            <input
              id="edit-rubrique"
              type="text"
              value={form.rubrique}
              onChange={(e) => handleChange('rubrique', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-task">Tâche</label>
            <input
              id="edit-task"
              type="text"
              value={form.task}
              onChange={(e) => handleChange('task', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-responsable">Responsable</label>
            <input
              id="edit-responsable"
              type="text"
              value={form.responsable}
              onChange={(e) => handleChange('responsable', e.target.value)}
            />
          </div>

          <div className="modal-form-row">
            <div className="form-group">
              <label htmlFor="edit-date-debut">Date début</label>
              <input
                id="edit-date-debut"
                type="date"
                value={form.dateDebut}
                onChange={(e) => handleChange('dateDebut', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-date-fin">Date fin prévue</label>
              <input
                id="edit-date-fin"
                type="date"
                value={form.dateFin}
                onChange={(e) => handleChange('dateFin', e.target.value)}
              />
            </div>
          </div>

          <div className="modal-form-row">
            <div className="form-group">
              <label htmlFor="edit-date-fin-reelle">Date fin réelle</label>
              <input
                id="edit-date-fin-reelle"
                type="date"
                value={form.dateFinReelle}
                onChange={(e) => handleChange('dateFinReelle', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-ponderation">Pondération (0 à 1)</label>
              <input
                id="edit-ponderation"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={form.ponderation}
                onChange={(e) => handleChange('ponderation', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="edit-progress">Statut</label>
            <select
              id="edit-progress"
              value={form.progress}
              onChange={(e) => handleChange('progress', e.target.value)}
            >
              <option value={0}>À faire</option>
              <option value={1}>Terminée</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="modal-cancel-btn" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="submit-btn modal-save-btn" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TaskEditModal
