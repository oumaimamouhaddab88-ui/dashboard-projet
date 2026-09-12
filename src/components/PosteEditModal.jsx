import { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { fetchWithAuth } from '../utils/api'

// Modal simple pour éditer les données propres au poste (pas ses attachements).
function PosteEditModal({ item, onClose, onSaved }) {
  const [designation, setDesignation] = useState(item.name || '')
  const [rubrique, setRubrique] = useState(item.rubrique || '')
  const [unite, setUnite] = useState(item.unit || '')
  const [quantite, setQuantite] = useState(item.quantity ?? '')
  const [prixUnitaire, setPrixUnitaire] = useState(item.unitCost ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!designation || !unite || quantite === '' || prixUnitaire === '') {
      setError('Désignation, unité, quantité et PU sont requis')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetchWithAuth(`/budget/postes/${item._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          designation,
          rubrique,
          unite,
          quantite,
          prixUnitaire,
        }),
      })

      if (!response) return
      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Erreur lors de la modification du poste')
        setSaving(false)
        return
      }

      setSaving(false)
      onSaved()
    } catch (err) {
      setError('Impossible de contacter le serveur')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Modifier le poste</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fermer">
            <FiX />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {error && <p className="form-error">{error}</p>}

          <label>
            Désignation
            <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} required />
          </label>

          <label>
            Rubrique
            <input type="text" value={rubrique} onChange={(e) => setRubrique(e.target.value)} />
          </label>

          <div className="modal-form-row">
            <label>
              Unité
              <input type="text" value={unite} onChange={(e) => setUnite(e.target.value)} required />
            </label>
            <label>
              Quantité
              <input
                type="number"
                min="0"
                step="1"
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
                required
              />
            </label>
          </div>

          <label>
            PU (DH/H.T)
            <input
              type="number"
              min="0"
              step="1"
              value={prixUnitaire}
              onChange={(e) => setPrixUnitaire(e.target.value)}
              required
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="modal-cancel-btn" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="submit" className="budget-details-btn modal-save-btn" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PosteEditModal
