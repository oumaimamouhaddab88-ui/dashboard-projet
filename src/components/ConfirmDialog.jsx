import { FiAlertTriangle, FiX } from 'react-icons/fi'

function ConfirmDialog({ title, message, confirmLabel = 'Confirmer', onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card confirm-dialog-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close-btn" onClick={onCancel} aria-label="Fermer">
            <FiX />
          </button>
        </div>

        <div className="confirm-dialog-body">
          <FiAlertTriangle className="confirm-dialog-icon" />
          <p>{message}</p>
        </div>

        <div className="modal-actions">
          <button type="button" className="modal-cancel-btn" onClick={onCancel} disabled={loading}>
            Annuler
          </button>
          <button
            type="button"
            className="confirm-dialog-danger-btn"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Suppression...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
