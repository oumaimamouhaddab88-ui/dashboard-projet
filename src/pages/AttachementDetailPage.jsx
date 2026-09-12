import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { FiArrowLeft, FiTrash2, FiSave } from 'react-icons/fi'
import { fetchWithAuth } from '../utils/api'
import DashboardLayout from '../components/DashboardLayout.jsx'
import '../budget.css'

function formatDH(value) {
  return `${Math.round(value || 0).toLocaleString('fr-FR')} DH`
}

// Page dédiée (et non plus un modal) : affiche TOUS les postes du Bac pour cet
// attachement, avec un % et une case "réalisé" par poste — cohérent avec le fichier
// Excel d'origine (une colonne Attachement = toutes les lignes/postes).
function AttachementDetailPage() {
  const { numero } = useParams()
  const [searchParams] = useSearchParams()
  const bacId = searchParams.get('bacId')
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [date, setDate] = useState('')
  const [observation, setObservation] = useState('')
  const [rows, setRows] = useState([])
  const [existed, setExisted] = useState(false)

  const loadBatch = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetchWithAuth(`/budget/bacs/${bacId}/attachements/${numero}`)
      if (!response) return
      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Erreur lors du chargement de l'attachement")
        setLoading(false)
        return
      }

      setDate(data.date ? new Date(data.date).toISOString().slice(0, 10) : '')
      setObservation(data.observation || '')
      setRows(
        (data.rows || []).map((r) => ({
          posteId: r.posteId,
          designation: r.designation,
          rubrique: r.rubrique,
          budgetHT: r.budgetHT,
          pourcentage: r.pourcentage != null ? r.pourcentage : '',
          realise: r.statut === 'realise',
          attachementId: r.attachementId,
        }))
      )
      setExisted((data.rows || []).some((r) => r.attachementId))
      setLoading(false)
    } catch (err) {
      setError('Impossible de contacter le serveur')
      setLoading(false)
    }
  }

  useEffect(() => {
    if (bacId && numero) loadBatch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bacId, numero])

  const totalHT = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const pct = r.pourcentage === '' ? 0 : Number(r.pourcentage) / 100
        return sum + pct * (r.budgetHT || 0)
      }, 0),
    [rows]
  )

  const totalRealiseHT = useMemo(
    () =>
      rows.reduce((sum, r) => {
        if (!r.realise) return sum
        const pct = r.pourcentage === '' ? 0 : Number(r.pourcentage) / 100
        return sum + pct * (r.budgetHT || 0)
      }, 0),
    [rows]
  )

  const updatePct = (posteId, value) => {
    setRows((prev) => prev.map((r) => (r.posteId === posteId ? { ...r, pourcentage: value } : r)))
  }

  const toggleRealise = (posteId) => {
    setRows((prev) => prev.map((r) => (r.posteId === posteId ? { ...r, realise: !r.realise } : r)))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!date) {
      setError('La date est requise')
      return
    }
    setSaving(true)
    setError('')

    try {
      const response = await fetchWithAuth(`/budget/bacs/${bacId}/attachements/${numero}`, {
        method: 'POST',
        body: JSON.stringify({
          date,
          observation,
          rows: rows.map((r) => ({
            posteId: r.posteId,
            pourcentage: r.pourcentage === '' ? null : Number(r.pourcentage),
            statut: r.realise ? 'realise' : 'en_attente',
          })),
        }),
      })

      if (!response) return
      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Erreur lors de l'enregistrement")
        setSaving(false)
        return
      }

      setSaving(false)
      navigate('/budget')
    } catch (err) {
      setError('Impossible de contacter le serveur')
      setSaving(false)
    }
  }

  const handleDeleteAll = async () => {
    if (!window.confirm(`Supprimer entièrement l'Attachement ${numero} pour tous les postes ?`)) return
    setSaving(true)
    try {
      const response = await fetchWithAuth(`/budget/bacs/${bacId}/attachements/${numero}`, { method: 'DELETE' })
      if (!response || !response.ok) {
        setSaving(false)
        return
      }
      navigate('/budget')
    } catch (err) {
      setError('Impossible de supprimer')
      setSaving(false)
    }
  }

  if (!bacId) {
    return (
      <DashboardLayout>
        <Link to="/budget" className="tasks-back-link">
          <FiArrowLeft /> Retour au budget
        </Link>
        <p className="form-error">Bac manquant — retournez à la page Budget et cliquez à nouveau sur "Détails".</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Link to="/budget" className="tasks-back-link">
        <FiArrowLeft /> Retour au budget
      </Link>

      <header className="dashboard-header">
        <div className="dashboard-header-brand">
          <div>
            <h1>
              Attachement {numero}
              {!loading && !existed ? ' (nouveau)' : ''}
            </h1>
          </div>
        </div>
        <div className="dashboard-header-actions">
          {existed && (
            <button className="dashboard-logout-btn" onClick={handleDeleteAll} disabled={saving}>
              <FiTrash2 /> Supprimer l'attachement
            </button>
          )}
        </div>
      </header>

      {!loading && (
        <div className="attachement-total-banner">
          <span className="attachement-total-banner-label">Montant HT réalisé</span>
          <span className="attachement-total-banner-value">{formatDH(totalRealiseHT)}</span>
          <span className="attachement-total-banner-sub">
            {rows.filter((r) => r.realise).length} / {rows.length} poste(s) réalisé(s) · sur un total de{' '}
            {formatDH(totalHT)}
          </span>
        </div>
      )}

      {loading ? (
        <p className="dashboard-loading">Chargement...</p>
      ) : (
        <form onSubmit={handleSave}>
          {error && <p className="form-error">{error}</p>}

          <div className="dashboard-card attachement-meta-card" style={{ marginBottom: 20 }}>
            <div className="modal-form-row">
              <label>
                Date
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </label>
              <label>
                Observation
                <input
                  type="text"
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  placeholder="Optionnel"
                />
              </label>
            </div>
          </div>

          <div className="dashboard-card tasks-table-card">
            <div className="tasks-table-wrapper">
              <table className="tasks-table">
                <thead>
                  <tr>
                    <th>Poste</th>
                    <th>Rubrique</th>
                    <th>Budget HT</th>
                    <th>%</th>
                    <th>Montant HT</th>
                    <th>Réalisé</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const pct = r.pourcentage === '' ? 0 : Number(r.pourcentage) / 100
                    return (
                      <tr key={r.posteId}>
                        <td className="tasks-table-name" style={{ whiteSpace: 'normal' }}>
                          {r.designation}
                        </td>
                        <td>
                          <span className="rubrique-tag">{r.rubrique || 'Autre'}</span>
                        </td>
                        <td>{formatDH(r.budgetHT)}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={r.pourcentage}
                            onChange={(e) => updatePct(r.posteId, e.target.value)}
                            className="attachement-batch-pct-input"
                          />
                        </td>
                        <td>{formatDH(pct * (r.budgetHT || 0))}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={r.realise}
                            onChange={() => toggleRealise(r.posteId)}
                            className="attachement-batch-checkbox"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="modal-actions attachement-batch-actions" style={{ marginTop: 20 }}>
            <span className="rubrique-count">Total HT (tous %) : {formatDH(totalHT)}</span>
            <div className="attachement-batch-actions-right">
              <button type="button" className="modal-cancel-btn" onClick={() => navigate('/budget')} disabled={saving}>
                Annuler
              </button>
              <button type="submit" className="budget-details-btn modal-save-btn" disabled={saving}>
                <FiSave /> {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      )}
    </DashboardLayout>
  )
}

export default AttachementDetailPage