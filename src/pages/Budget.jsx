import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FiPaperclip, FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'
import { fetchWithAuth } from '../utils/api'
import { useProject } from '../context/ProjectContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import PosteEditModal from '../components/PosteEditModal.jsx'
import PosteCreateModal from '../components/PosteCreateModal.jsx'
import '../budget.css'
import {
  computeItemBudget,
  computeItemSummary,
  computeItemAlerts,
  computeAttachementTotals,
} from '../utils/budgetCalculations'

function formatDH(value) {
  return `${Math.round(value || 0).toLocaleString('fr-FR')} DH`
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function statusLabel(status) {
  return status === 'realise' ? 'Réalisé' : 'Planifié'
}

function Budget() {
  const { currentProjectId } = useProject()
  const [bacs, setBacs] = useState([])
  const [selectedBacId, setSelectedBacId] = useState(null)
  const [items, setItems] = useState([])
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingItemId, setEditingItemId] = useState(null)
  const [creating, setCreating] = useState(false)

  const handleDeletePoste = async (item) => {
    if (!window.confirm(`Supprimer le poste "${item.name}" et tous ses attachements ?`)) return
    try {
      const response = await fetchWithAuth(`/budget/postes/${item._id}`, { method: 'DELETE' })
      if (!response || !response.ok) return
      loadData()
    } catch (err) {
      setError('Impossible de supprimer ce poste')
    }
  }

  const handleDeleteAttachement = async (att) => {
    if (!window.confirm(`Supprimer entièrement l'Attachement ${att.numero} pour tous les postes ?`)) return
    try {
      const response = await fetchWithAuth(`/budget/bacs/${selectedBacId}/attachements/${att.numero}`, {
        method: 'DELETE',
      })
      if (!response || !response.ok) return
      loadData()
    } catch (err) {
      setError("Impossible de supprimer cet attachement")
    }
  }

  // --- Chargement des données (items + attachements) pour le Bac sélectionné, à
  // l'intérieur du projet actuellement sélectionné (ProjectContext). --
  const loadData = async () => {
    if (!currentProjectId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ projectId: currentProjectId })
      if (selectedBacId) params.set('bacId', selectedBacId)
      const response = await fetchWithAuth(`/budget/data?${params.toString()}`)
      if (!response) return
      const data = await response.json()
      if (!response.ok) {
        setError(data.message || 'Erreur lors du chargement du budget')
        setLoading(false)
        return
      }
      setBacs(data.bacs || [])
      if (!selectedBacId && data.bacId) setSelectedBacId(data.bacId)
      const sortedAttachments = [...(data.attachments || [])].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      )
      setItems(data.items || [])
      setAttachments(sortedAttachments)
      setLoading(false)
    } catch (err) {
      setError('Impossible de contacter le serveur')
      setLoading(false)
    }
  }

  // Quand on change de projet, on repart d'un Bac vierge (le Bac du nouveau
  // projet sera résolu automatiquement par /budget/data).
  useEffect(() => {
    setSelectedBacId(null)
    setItems([])
    setAttachments([])
  }, [currentProjectId])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBacId, currentProjectId])

  const itemsWithSummary = useMemo(() => {
    return items.map((item) => {
      const summary = computeItemSummary(item, attachments)
      return {
        ...item,
        summary,
        alerts: computeItemAlerts(item, summary),
      }
    })
  }, [items, attachments])

  const editingItem = itemsWithSummary.find((i) => i._id === editingItemId)

  const budgetTotal = useMemo(() => items.reduce((sum, item) => sum + computeItemBudget(item), 0), [items])

  // --- Lignes de la section Attachements : un Attachement = une situation qui couvre TOUS
  // les postes du Bac en une seule saisie (comme une colonne "Attachement N" de l'Excel d'origine).
  const attachementRows = useMemo(() => {
    const totals = computeAttachementTotals(items, attachments)
    return totals.map((att) => {
      const nbPostes = items.filter((item) => (item.percentages?.[att.id] || 0) > 0).length
      return { ...att, nbPostes }
    })
  }, [items, attachments])

  const nextAttachementNumero = useMemo(() => {
    if (attachments.length === 0) return 1
    return Math.max(...attachments.map((a) => a.numero || 0)) + 1
  }, [attachments])

  if (loading && items.length === 0) {
    return (
      <DashboardLayout>
        <p className="dashboard-loading">Chargement du budget...</p>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <p className="form-error">{error}</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <header className="dashboard-header">
        <div className="dashboard-header-brand">
          <div>
            <h1>Suivi Budgétaire</h1>
            <p>
              Grande Révision JPH — {items.length} poste{items.length !== 1 ? 's' : ''} · Budget total{' '}
              {formatDH(budgetTotal)}
            </p>
          </div>
        </div>
        <div className="dashboard-header-actions">
          <button
            className="budget-details-btn"
            onClick={() => setCreating(true)}
            disabled={!selectedBacId}
          >
            <FiPlus /> Ajouter un poste
          </button>
        </div>
      </header>

      {/* Tableau principal — les postes, comme avant */}
      <div className="dashboard-card tasks-table-card">
        <div className="tasks-table-wrapper">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Rubrique</th>
                <th>Désignation</th>
                <th>Qté</th>
                <th>PU</th>
                <th>Budget HT</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {itemsWithSummary.map((item, index) => (
                <tr key={item._id}>
                  <td>{index + 1}</td>
                  <td>
                    <span className="badge badge-todo">{item.rubrique}</span>
                  </td>
                  <td
                    className="tasks-table-name"
                    title={item.fullDescription}
                    style={{ whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: 260, lineHeight: 1.4 }}
                  >
                    {item.name}
                    {item.documents?.length > 0 && (
                      <span
                        title={item.documents.map((d) => d.name).join(', ')}
                        style={{ marginLeft: 6, color: 'var(--text-muted)', fontSize: 12 }}
                      >
                        <FiPaperclip style={{ verticalAlign: 'middle' }} /> {item.documents.length}
                      </span>
                    )}
                    {item.alerts.length > 0 && (
                      <div className="team-workload-badges" style={{ marginTop: 6 }}>
                        {item.alerts.map((a, i) => (
                          <span
                            key={i}
                            className={`badge badge-${a.level === 'danger' ? 'overdue' : a.level === 'success' ? 'done' : 'todo'}`}
                          >
                            {a.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>{item.quantity}</td>
                  <td>{formatDH(item.unitCost)}</td>
                  <td>{formatDH(computeItemBudget(item))}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        className="budget-details-btn"
                        onClick={() => setEditingItemId(item._id)}
                        aria-label="Modifier le poste"
                      >
                        <FiEdit2 /> Modifier
                      </button>
                      <button
                        className="tasks-table-delete-btn"
                        onClick={() => handleDeletePoste(item)}
                        aria-label="Supprimer le poste"
                        title="Supprimer ce poste"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {itemsWithSummary.length === 0 && (
                <tr>
                  <td colSpan={7} className="dashboard-loading">
                    Aucun poste pour ce Bac.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section Attachements — même structure que la section Postes ci-dessus.
          Le détail d'un attachement s'ouvre toujours sur sa propre page
          (% + case "réalisé" par poste). */}
      <div className="dashboard-card tasks-table-card budget-attachements-card">
        <div className="dashboard-card-header budget-section-header">
          <h2>Attachements</h2>
          {selectedBacId ? (
            <Link
              to={`/budget/attachements/${nextAttachementNumero}?bacId=${selectedBacId}`}
              className="budget-details-btn"
            >
              <FiPlus /> Nouvel Attachement
            </Link>
          ) : (
            <button className="budget-details-btn" disabled>
              <FiPlus /> Nouvel Attachement
            </button>
          )}
        </div>
        <div className="tasks-table-wrapper">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Postes renseignés</th>
                <th>Montant HT</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {attachementRows.map((att) => (
                <tr key={att.id}>
                  <td>{att.name}</td>
                  <td>{formatDate(att.date)}</td>
                  <td>
                    <span className={`badge ${att.status === 'realise' ? 'badge-done' : 'badge-todo'}`}>
                      {statusLabel(att.status)}
                    </span>
                  </td>
                  <td>
                    {att.nbPostes} / {items.length}
                  </td>
                  <td>{formatDH(att.montantHT)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Link
                        to={`/budget/attachements/${att.numero}?bacId=${selectedBacId}`}
                        className="budget-details-btn"
                      >
                        <FiEdit2 /> Détails
                      </Link>
                      <button
                        className="tasks-table-delete-btn"
                        onClick={() => handleDeleteAttachement(att)}
                        aria-label="Supprimer cet attachement"
                        title="Supprimer cet attachement"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {attachementRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="dashboard-loading">
                    Aucun attachement pour ce Bac. Cliquez sur « Nouvel Attachement » pour commencer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingItem && (
        <PosteEditModal
          item={editingItem}
          onClose={() => setEditingItemId(null)}
          onSaved={() => {
            setEditingItemId(null)
            loadData()
          }}
        />
      )}

      {creating && (
        <PosteCreateModal
          bacId={selectedBacId}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false)
            loadData()
          }}
        />
      )}
    </DashboardLayout>
  )
}

export default Budget
