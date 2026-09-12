import { useState } from 'react'
import {
  FiX,
  FiPlus,
  FiFileText,
  FiImage,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiClock,
} from 'react-icons/fi'
import {
  computePosteBudget,
  computePosteBudgetTTC,
  computePosteSummary,
  computeAttachementAmounts,
  resolveAttachementStatut,
  computePosteAlerts,
} from '../utils/budgetCalculations'
import AttachementFormModal from './AttachementFormModal.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

function formatDH(value) {
  return `${Math.round(value || 0).toLocaleString('fr-FR')} DH`
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function StatutBadge({ statut }) {
  if (statut === 'realise') {
    return (
      <span className="badge badge-done">
        <FiCheckCircle /> Réalisé
      </span>
    )
  }
  return (
    <span className="badge badge-todo">
      <FiClock /> En attente
    </span>
  )
}

/**
 * Drawer plein détail d'un poste : infos de base, résumé auto, tableau des attachements,
 * ajout / édition / suppression d'attachements. S'ouvre en overlay comme les modales existantes.
 *
 * Props:
 *  - poste: { _id, designation, rubrique, unite, quantite, prixUnitaire }
 *  - attachements: liste des attachements de ce poste
 *  - onClose()
 *  - onAttachementSaved(attachement)  -> callback après création/édition
 *  - onAttachementDeleted(attachementId)
 */
function PosteDrawer({ poste, attachements, onClose, onAttachementSaved, onAttachementDeleted }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAttachement, setEditingAttachement] = useState(null)
  const [deletingAttachement, setDeletingAttachement] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const budgetHT = computePosteBudget(poste)
  const budgetTTC = computePosteBudgetTTC(poste)
  const summary = computePosteSummary(poste, attachements)
  const alerts = computePosteAlerts(poste, attachements)

  const handleDeleteConfirm = async () => {
    if (!deletingAttachement) return
    setIsDeleting(true)
    await onAttachementDeleted(deletingAttachement)
    setIsDeleting(false)
    setDeletingAttachement(null)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card poste-drawer-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{poste.designation}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fermer">
            <FiX />
          </button>
        </div>

        {alerts.length > 0 && (
          <div className="team-workload-badges" style={{ marginBottom: 16 }}>
            {alerts.map((a, i) => (
              <span key={i} className={`badge badge-${a.level === 'danger' ? 'overdue' : a.level === 'success' ? 'done' : 'todo'}`}>
                {a.label}
              </span>
            ))}
          </div>
        )}

        {/* Infos de base + budget calculé automatiquement */}
        <div className="rubrique-overview-grid" style={{ marginBottom: 24 }}>
          <div className="rubrique-overview-item">
            <span className="rubrique-overview-percent">Rubrique</span>
            <span className="rubrique-name" style={{ textTransform: 'none' }}>{poste.rubrique || '—'}</span>
          </div>
          <div className="rubrique-overview-item">
            <span className="rubrique-overview-percent">Quantité</span>
            <span className="rubrique-name" style={{ textTransform: 'none' }}>{poste.quantite} {poste.unite}</span>
          </div>
          <div className="rubrique-overview-item">
            <span className="rubrique-overview-percent">Prix unitaire</span>
            <span className="rubrique-name" style={{ textTransform: 'none' }}>{formatDH(poste.prixUnitaire)}</span>
          </div>
          <div className="rubrique-overview-item">
            <span className="rubrique-overview-percent">Budget HT (calculé)</span>
            <span className="rubrique-name" style={{ textTransform: 'none' }}>{formatDH(budgetHT)}</span>
          </div>
          <div className="rubrique-overview-item">
            <span className="rubrique-overview-percent">Budget TTC (calculé)</span>
            <span className="rubrique-name" style={{ textTransform: 'none' }}>{formatDH(budgetTTC)}</span>
          </div>
          <div className="rubrique-overview-item">
            <span className="rubrique-overview-percent">Avancement</span>
            <span className="rubrique-percent">{Math.round(summary.avancement * 100)}%</span>
          </div>
        </div>

        <div className="rubrique-progress-bar" style={{ marginBottom: 24 }}>
          <div
            className="rubrique-progress-fill"
            style={{ width: `${Math.round(summary.avancement * 100)}%` }}
          />
        </div>

        {/* Tableau des attachements */}
        <div className="dashboard-card-header">
          <h2 style={{ fontSize: 15 }}>Attachements ({attachements.length})</h2>
          <button className="dashboard-link-btn" onClick={() => setShowAddForm(true)}>
            <FiPlus /> Ajouter un attachement
          </button>
        </div>

        <div className="tasks-table-wrapper" style={{ marginTop: 12, marginBottom: 20 }}>
          <table className="tasks-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>%</th>
                <th>Montant HT</th>
                <th>TVA</th>
                <th>Montant TTC</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Document</th>
                <th>Observation</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {attachements.map((a, idx) => {
                const statut = resolveAttachementStatut(a)
                const amounts = computeAttachementAmounts(poste, { ...a, statut })
                return (
                  <tr key={a._id || idx}>
                    <td>{a.numero || idx + 1}</td>
                    <td>{amounts.pourcentage ? `${Math.round(amounts.pourcentage)}%` : '—'}</td>
                    <td>{formatDH(amounts.montantHT)}</td>
                    <td>{formatDH(amounts.tva)}</td>
                    <td>{formatDH(amounts.montantTTC)}</td>
                    <td>{formatDate(a.date)}</td>
                    <td><StatutBadge statut={statut} /></td>
                    <td>
                      {a.document ? (
                        <a href={a.document} target="_blank" rel="noreferrer" className="task-document-link">
                          <FiFileText className="document-icon document-icon-pdf" />
                        </a>
                      ) : '—'}
                      {a.photos && a.photos.length > 0 && (
                        <FiImage className="document-icon document-icon-image" style={{ marginLeft: 6 }} />
                      )}
                    </td>
                    <td style={{ whiteSpace: 'normal', maxWidth: 180 }}>{a.observation || '—'}</td>
                    <td>
                      <div className="tasks-table-actions">
                        <button
                          className="tasks-table-edit-btn"
                          onClick={() => setEditingAttachement(a)}
                          aria-label="Modifier l'attachement"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          className="tasks-table-delete-btn"
                          onClick={() => setDeletingAttachement(a)}
                          aria-label="Supprimer l'attachement"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {attachements.length === 0 && (
                <tr>
                  <td colSpan={10} className="dashboard-loading">Aucun attachement pour ce poste.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Résumé automatique */}
        <div className="dashboard-card" style={{ boxShadow: 'none', border: '1px solid var(--border-color)', padding: 20 }}>
          <div className="rubrique-overview-grid">
            <div className="rubrique-overview-item">
              <span className="rubrique-overview-percent">Total HT consommé</span>
              <span className="rubrique-name" style={{ textTransform: 'none' }}>{formatDH(summary.totalHT)}</span>
            </div>
            <div className="rubrique-overview-item">
              <span className="rubrique-overview-percent">Total TVA</span>
              <span className="rubrique-name" style={{ textTransform: 'none' }}>{formatDH(summary.totalTVA)}</span>
            </div>
            <div className="rubrique-overview-item">
              <span className="rubrique-overview-percent">Total TTC</span>
              <span className="rubrique-name" style={{ textTransform: 'none' }}>{formatDH(summary.totalTTC)}</span>
            </div>
            <div className="rubrique-overview-item">
              <span className="rubrique-overview-percent">Budget restant</span>
              <span className="rubrique-name" style={{ textTransform: 'none' }}>{formatDH(summary.resteHT)}</span>
            </div>
            <div className="rubrique-overview-item">
              <span className="rubrique-overview-percent">Attachements réalisés</span>
              <span className="rubrique-name" style={{ textTransform: 'none' }}>{summary.nbRealises}</span>
            </div>
            <div className="rubrique-overview-item">
              <span className="rubrique-overview-percent">Attachements en attente</span>
              <span className="rubrique-name" style={{ textTransform: 'none' }}>{summary.nbEnAttente}</span>
            </div>
          </div>
        </div>
      </div>

      {(showAddForm || editingAttachement) && (
        <AttachementFormModal
          poste={poste}
          attachement={editingAttachement}
          nextNumero={attachements.length + 1}
          onClose={() => {
            setShowAddForm(false)
            setEditingAttachement(null)
          }}
          onSaved={(saved) => {
            onAttachementSaved(saved)
            setShowAddForm(false)
            setEditingAttachement(null)
          }}
        />
      )}

      {deletingAttachement && (
        <ConfirmDialog
          title="Supprimer cet attachement ?"
          message="Cette action est irréversible. Les montants du poste seront recalculés automatiquement."
          confirmLabel="Supprimer"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingAttachement(null)}
          loading={isDeleting}
        />
      )}
    </div>
  )
}

export default PosteDrawer
