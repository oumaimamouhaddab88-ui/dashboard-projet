import { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { fetchWithAuth } from '../utils/api'
import { computePosteBudget, computeAttachementAmounts } from '../utils/budgetCalculations'

function formatDH(value) {
  return `${Math.round(value || 0).toLocaleString('fr-FR')} DH`
}

/**
 * Formulaire d'ajout / édition d'un attachement.
 * L'utilisateur saisit UNIQUEMENT le pourcentage réalisé (ou un montant HT manuel), la date,
 * l'observation, le document/photos et le statut. Tout le reste (HT, TVA, TTC) est calculé
 * en direct et affiché en aperçu avant validation — jamais saisi à la main.
 *
 * Props:
 *  - poste: poste parent (pour calculer l'aperçu du budget)
 *  - attachement: si fourni, on est en mode édition
 *  - nextNumero: numéro suggéré pour un nouvel attachement
 *  - onClose(), onSaved(attachement)
 */
function AttachementFormModal({ poste, attachement, nextNumero, onClose, onSaved }) {
  const isEdit = Boolean(attachement)
  const [inputMode, setInputMode] = useState(attachement?.montantHTManuel != null ? 'montant' : 'pourcentage')
  const [form, setForm] = useState({
    pourcentage: attachement?.pourcentage ?? '',
    montantHTManuel: attachement?.montantHTManuel ?? '',
    date: attachement?.date ? attachement.date.slice(0, 10) : '',
    observation: attachement?.observation ?? '',
    statut: attachement?.statut ?? 'realise',
    document: null, // fichier PDF sélectionné (upload à l'enregistrement)
    photos: [], // fichiers image sélectionnés
    existingDocument: attachement?.document ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Aperçu live des montants calculés, pour que l'utilisateur voie le résultat avant de valider
  const previewAttachement = {
    pourcentage: inputMode === 'pourcentage' && form.pourcentage !== '' ? Number(form.pourcentage) : null,
    montantHTManuel: inputMode === 'montant' && form.montantHTManuel !== '' ? Number(form.montantHTManuel) : null,
    statut: form.statut,
  }
  const preview = computeAttachementAmounts(poste, previewAttachement)
  const budgetHT = computePosteBudget(poste)

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const body = new FormData()
      body.append('numero', attachement?.numero || nextNumero)
      body.append('statut', form.statut)
      body.append('date', form.date)
      body.append('observation', form.observation)
      if (inputMode === 'pourcentage' && form.pourcentage !== '') {
        body.append('pourcentage', form.pourcentage)
      }
      if (inputMode === 'montant' && form.montantHTManuel !== '') {
        body.append('montantHTManuel', form.montantHTManuel)
      }
      if (form.document) body.append('document', form.document)
      form.photos.forEach((file) => body.append('photos', file))

      const url = isEdit ? `/budget/attachements/${attachement._id}` : `/budget/postes/${poste._id}/attachements`
      const response = await fetchWithAuth(url, {
        method: isEdit ? 'PUT' : 'POST',
        body,
      })
      if (!response) return

      const data = await response.json()
      if (!response.ok) {
        setError(data.message || "Erreur lors de l'enregistrement")
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
          <h2>{isEdit ? "Modifier l'attachement" : 'Ajouter un attachement'}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fermer">
            <FiX />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="gantt-mode-toggle" style={{ alignSelf: 'flex-start' }}>
            <button
              type="button"
              className={`gantt-mode-btn ${inputMode === 'pourcentage' ? 'active' : ''}`}
              onClick={() => setInputMode('pourcentage')}
            >
              % réalisé
            </button>
            <button
              type="button"
              className={`gantt-mode-btn ${inputMode === 'montant' ? 'active' : ''}`}
              onClick={() => setInputMode('montant')}
            >
              Montant HT
            </button>
          </div>

          {inputMode === 'pourcentage' ? (
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="Pourcentage réalisé (ex: 25)"
              value={form.pourcentage}
              onChange={handleChange('pourcentage')}
            />
          ) : (
            <input
              type="number"
              min="0"
              max={budgetHT}
              step="1"
              placeholder="Montant HT réalisé (DH)"
              value={form.montantHTManuel}
              onChange={handleChange('montantHTManuel')}
            />
          )}

          <div className="modal-form-row">
            <input type="date" value={form.date} onChange={handleChange('date')} required />
            <select value={form.statut} onChange={handleChange('statut')}>
              <option value="realise">Réalisé</option>
              <option value="en_attente">En attente</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="Observation"
            value={form.observation}
            onChange={handleChange('observation')}
          />

          <div className="modal-form-row">
            <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Document PDF
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setForm((prev) => ({ ...prev, document: e.target.files[0] }))}
              />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Photos
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setForm((prev) => ({ ...prev, photos: Array.from(e.target.files) }))}
              />
            </label>
          </div>

          {/* Aperçu calculé automatiquement — non éditable */}
          <div className="dashboard-card" style={{ boxShadow: 'none', border: '1px solid var(--border-color)', padding: 16 }}>
            <div className="gantt-popover-row">
              <span>Montant HT</span>
              <strong>{formatDH(preview.montantHT)}</strong>
            </div>
            <div className="gantt-popover-row">
              <span>TVA (20%)</span>
              <strong>{formatDH(preview.tva)}</strong>
            </div>
            <div className="gantt-popover-row">
              <span>Montant TTC</span>
              <strong>{formatDH(preview.montantTTC)}</strong>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="modal-cancel-btn" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="submit" className="dashboard-link-btn modal-save-btn" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AttachementFormModal
