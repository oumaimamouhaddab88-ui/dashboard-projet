import { useState } from 'react'
import { FiX, FiEdit2 } from 'react-icons/fi'
import { fetchWithAuth } from '../utils/api'

function formatDH(value) {
  return `${Math.round(value || 0).toLocaleString('fr-FR')} DH`
}

function formatPct(value) {
  return value ? `${Math.round(value * 100)}%` : '—'
}

/**
 * Modal de détail d'un poste budgétaire, avec bouton "Modifier" qui bascule
 * les champs (infos du poste + % par attachement) en mode édition.
 *
 * Props:
 *  - item: le poste (avec .summary calculé côté front)
 *  - attachments: liste des créneaux d'attachement (id, name, date)
 *  - onClose()
 *  - onSaved(updatedItem): appelé après un enregistrement réussi, pour rafraîchir le tableau
 */
function PosteDetailModal({ item, attachments, onClose, onSaved, onQuickRefresh, startInEdit = false }) {
  const [editing, setEditing] = useState(startInEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [togglingIds, setTogglingIds] = useState({})

  const [form, setForm] = useState({
    name: item.name,
    rubrique: item.rubrique,
    unit: item.unit,
    quantity: item.quantity,
    unitCost: item.unitCost,
  })
  const [pctForm, setPctForm] = useState(
    Object.fromEntries(attachments.map((att) => [att.id, Math.round((item.percentages?.[att.id] || 0) * 100)]))
  )
  const [realiseForm, setRealiseForm] = useState(
    Object.fromEntries(attachments.map((att) => [att.id, item.realise?.[att.id] || false]))
  )

  // Case à cocher "Réalisé" — cliquable à tout moment (pas besoin du mode édition),
  // sauvegarde immédiate côté serveur.
  const handleToggleRealise = async (att) => {
    const newRealise = !realiseForm[att.id]
    setRealiseForm((prev) => ({ ...prev, [att.id]: newRealise }))
    setTogglingIds((prev) => ({ ...prev, [att.id]: true }))

    try {
      const statut = newRealise ? 'realise' : 'en_attente'
      const attachementId = item.attachementIds?.[att.id]
      if (attachementId) {
        await fetchWithAuth(`/budget/attachements/${attachementId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ statut }),
        })
      } else if (newRealise) {
        // Pas encore d'attachement pour ce créneau : on en crée un avec le % déjà saisi (ou 0)
        await fetchWithAuth(`/budget/postes/${item._id}/attachements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numero: att.numero,
            pourcentage: Number(pctForm[att.id] || 0),
            date: att.date,
            statut,
          }),
        })
      }
      onQuickRefresh?.() // rafraîchit le tableau en arrière-plan, sans fermer la modal
    } catch (err) {
      // en cas d'échec, on annule le changement visuel
      setRealiseForm((prev) => ({ ...prev, [att.id]: !newRealise }))
    } finally {
      setTogglingIds((prev) => ({ ...prev, [att.id]: false }))
    }
  }

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
  const handlePctChange = (attId) => (e) => setPctForm((prev) => ({ ...prev, [attId]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      // 1) Sauvegarde des infos de base du poste
      const posteRes = await fetchWithAuth(`/budget/postes/${item._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designation: form.name,
          rubrique: form.rubrique,
          unite: form.unit,
          quantite: form.quantity,
          prixUnitaire: form.unitCost,
        }),
      })
      if (!posteRes || !posteRes.ok) {
        const data = posteRes ? await posteRes.json() : {}
        setError(data.message || "Erreur lors de l'enregistrement du poste")
        setSaving(false)
        return
      }

      // 2) Sauvegarde des pourcentages + statut réalisé par attachement
      for (const att of attachments) {
        const newPct = Number(pctForm[att.id] || 0)
        const oldPct = Math.round((item.percentages?.[att.id] || 0) * 100)
        const newRealise = Boolean(realiseForm[att.id])
        const oldRealise = Boolean(item.realise?.[att.id])
        if (newPct === oldPct && newRealise === oldRealise) continue // rien à faire si inchangé

        const statut = newRealise ? 'realise' : 'en_attente'
        const attachementId = item.attachementIds?.[att.id]
        if (attachementId) {
          await fetchWithAuth(`/budget/attachements/${attachementId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pourcentage: newPct, statut }),
          })
        } else if (newPct > 0 || newRealise) {
          await fetchWithAuth(`/budget/postes/${item._id}/attachements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              numero: att.numero,
              pourcentage: newPct,
              date: att.date,
              statut,
            }),
          })
        }
      }

      setSaving(false)
      setEditing(false)
      onSaved()
    } catch (err) {
      setError('Impossible de contacter le serveur')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card poste-drawer-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editing ? 'Modifier le poste' : item.name}</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!editing && (
              <button className="dashboard-link-btn" onClick={() => setEditing(true)}>
                <FiEdit2 /> Modifier
              </button>
            )}
            <button className="modal-close-btn" onClick={onClose} aria-label="Fermer">
              <FiX />
            </button>
          </div>
        </div>

        <div className="modal-form" style={{ gap: 20 }}>
          {/* Infos de base */}
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="text" value={form.name} onChange={handleChange('name')} placeholder="Désignation" />
              <div className="modal-form-row">
                <input type="text" value={form.rubrique} onChange={handleChange('rubrique')} placeholder="Rubrique" />
                <input type="text" value={form.unit} onChange={handleChange('unit')} placeholder="Unité" />
              </div>
              <div className="modal-form-row">
                <input type="number" value={form.quantity} onChange={handleChange('quantity')} placeholder="Quantité" />
                <input type="number" value={form.unitCost} onChange={handleChange('unitCost')} placeholder="PU (DH)" />
              </div>
            </div>
          ) : (
            <div className="dashboard-card" style={{ boxShadow: 'none', border: '1px solid var(--border-color)', padding: 16 }}>
              <div className="gantt-popover-row"><span>Rubrique</span><strong>{item.rubrique}</strong></div>
              <div className="gantt-popover-row"><span>Unité</span><strong>{item.unit}</strong></div>
              <div className="gantt-popover-row"><span>Quantité</span><strong>{item.quantity}</strong></div>
              <div className="gantt-popover-row"><span>PU</span><strong>{formatDH(item.unitCost)}</strong></div>
              <div className="gantt-popover-row"><span>Budget HT</span><strong>{formatDH(item.summary.budgetHT)}</strong></div>
              <div className="gantt-popover-row"><span>Total consommé HT</span><strong>{formatDH(item.summary.totalHT)}</strong></div>
              <div className="gantt-popover-row"><span>Reste HT</span><strong>{formatDH(item.summary.resteHT)}</strong></div>
              <div className="gantt-popover-row"><span>Avancement</span><strong>{formatPct(item.summary.avancement)}</strong></div>
            </div>
          )}

          {/* Détail par attachement */}
          <div>
            <strong style={{ fontSize: 13 }}>Détail par attachement</strong>
            <table className="tasks-table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Attachement</th>
                  <th>Date</th>
                  <th>%</th>
                  <th>Réalisé</th>
                  <th>Montant HT</th>
                </tr>
              </thead>
              <tbody>
                {item.summary.rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.date ? new Date(r.date).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>
                      {editing ? (
                        <input
                          type="number"
                          min="0"
                          step="1"
                          style={{ width: 70 }}
                          value={pctForm[r.id]}
                          onChange={handlePctChange(r.id)}
                        />
                      ) : (
                        formatPct(r.pourcentage)
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={realiseForm[r.id] || false}
                        disabled={togglingIds[r.id]}
                        onChange={() => handleToggleRealise(r)}
                        style={{ cursor: togglingIds[r.id] ? 'wait' : 'pointer', width: 16, height: 16 }}
                      />
                    </td>
                    <td>{formatDH(r.montantHT)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Documents */}
          {item.documents?.length > 0 && (
            <div>
              <strong style={{ fontSize: 13 }}>Documents</strong>
              <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                {item.documents.map((doc, i) => (
                  <li key={i}>
                    <a href={doc.url} target="_blank" rel="noreferrer">{doc.name}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          {editing && (
            <div className="modal-actions">
              <button type="button" className="modal-cancel-btn" onClick={() => setEditing(false)} disabled={saving}>
                Annuler
              </button>
              <button type="button" className="dashboard-link-btn modal-save-btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PosteDetailModal