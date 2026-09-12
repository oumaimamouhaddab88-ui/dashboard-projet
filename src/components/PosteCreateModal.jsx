import { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { fetchWithAuth } from '../utils/api'

/**
 * Modal simple de création d'un poste dans un Bac.
 * Props:
 *  - bacId: le Bac dans lequel créer le poste
 *  - onClose()
 *  - onCreated(): appelé après création réussie, pour rafraîchir le tableau
 */
function PosteCreateModal({ bacId, onClose, onCreated }) {
  const [form, setForm] = useState({
    designation: '',
    rubrique: '',
    unite: '',
    quantite: '',
    prixUnitaire: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await fetchWithAuth(`/budget/bacs/${bacId}/postes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!response) return
      const data = await response.json()
      if (!response.ok) {
        setError(data.message || "Erreur lors de la création du poste")
        setSaving(false)
        return
      }
      onCreated()
    } catch (err) {
      setError('Impossible de contacter le serveur')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Ajouter un poste</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fermer">
            <FiX />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Désignation"
            value={form.designation}
            onChange={handleChange('designation')}
            required
          />
          <input
            type="text"
            placeholder="Rubrique"
            value={form.rubrique}
            onChange={handleChange('rubrique')}
          />
          <div className="modal-form-row">
            <input
              type="text"
              placeholder="Unité (F, M²...)"
              value={form.unite}
              onChange={handleChange('unite')}
              required
            />
            <input
              type="number"
              placeholder="Quantité"
              value={form.quantite}
              onChange={handleChange('quantite')}
              required
            />
          </div>
          <input
            type="number"
            placeholder="Prix Unitaire (DH)"
            value={form.prixUnitaire}
            onChange={handleChange('prixUnitaire')}
            required
          />

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="modal-cancel-btn" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="submit" className="dashboard-link-btn modal-save-btn" disabled={saving}>
              {saving ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PosteCreateModal
