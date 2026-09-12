import { useState, useEffect, useMemo } from 'react'
import { FiUserPlus, FiEdit2, FiTrash2, FiMail, FiPhone, FiX } from 'react-icons/fi'
import { fetchWithAuth } from '../utils/api'
import { useProject } from '../context/ProjectContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

const AVATAR_COLORS = [
  '#00954a', '#2f6fed', '#e67e22', '#9b59b6',
  '#e74c3c', '#16a085', '#d68910', '#3b82f6',
]

function colorForName(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const EMPTY_FORM = {
  nom: '',
  poste: '',
  email: '',
  telephone: '',
  dateEntree: '',
}

function MemberFormModal({ member, projectId, onClose, onSaved }) {
  const isEditing = Boolean(member)
  const [form, setForm] = useState(() =>
    member
      ? {
          nom: member.nom || '',
          poste: member.poste || '',
          email: member.email || '',
          telephone: member.telephone || '',
          dateEntree: member.dateEntree ? member.dateEntree.slice(0, 10) : '',
        }
      : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nom.trim()) {
      setError('Le nom est obligatoire')
      return
    }

    setSaving(true)
    setError('')

    try {
      // Le projectId n'est envoyé qu'à la création : on ne déplace jamais un
      // membre existant d'un projet à un autre via ce formulaire.
      const body = isEditing ? form : { ...form, projectId }

      const response = await fetchWithAuth(isEditing ? `/team/${member._id}` : '/team', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2>{isEditing ? 'Modifier le membre' : 'Nouveau membre'}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fermer">
            <FiX />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nom complet"
            value={form.nom}
            onChange={handleChange('nom')}
            required
          />
          <input
            type="text"
            placeholder="Poste / rôle"
            value={form.poste}
            onChange={handleChange('poste')}
          />
          <div className="modal-form-row">
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange('email')}
            />
            <input
              type="tel"
              placeholder="Téléphone"
              value={form.telephone}
              onChange={handleChange('telephone')}
            />
          </div>
          <label>
            Date d'entrée
            <input
              type="date"
              value={form.dateEntree}
              onChange={handleChange('dateEntree')}
            />
          </label>

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

function Equipe() {
  const { currentProjectId } = useProject()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [deletingMember, setDeletingMember] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!currentProjectId) return

    const loadMembers = async () => {
      setLoading(true)
      try {
        const response = await fetchWithAuth(`/team?projectId=${currentProjectId}`)
        if (!response) return

        const data = await response.json()

        if (!response.ok) {
          setError(data.message || "Erreur lors du chargement de l'équipe")
          setLoading(false)
          return
        }

        setMembers(data)
        setLoading(false)
      } catch (err) {
        setError('Impossible de contacter le serveur')
        setLoading(false)
      }
    }

    loadMembers()
  }, [currentProjectId])

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => (a.nom || '').localeCompare(b.nom || '')),
    [members]
  )

  const handleSaved = (savedMember) => {
    setMembers((prev) => {
      const exists = prev.some((m) => m._id === savedMember._id)
      return exists
        ? prev.map((m) => (m._id === savedMember._id ? savedMember : m))
        : [...prev, savedMember]
    })
    setShowForm(false)
    setEditingMember(null)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingMember) return
    setIsDeleting(true)

    try {
      const response = await fetchWithAuth(`/team/${deletingMember._id}`, {
        method: 'DELETE',
      })

      if (!response) return

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Erreur lors de la suppression')
        setIsDeleting(false)
        setDeletingMember(null)
        return
      }

      setMembers((prev) => prev.filter((m) => m._id !== deletingMember._id))
      setIsDeleting(false)
      setDeletingMember(null)
    } catch (err) {
      setError('Impossible de contacter le serveur')
      setIsDeleting(false)
      setDeletingMember(null)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <p className="dashboard-loading">Chargement de l'équipe...</p>
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
            <h1>Équipe</h1>
            <p>{sortedMembers.length} membre{sortedMembers.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="dashboard-header-actions">
          <button className="dashboard-link-btn" onClick={() => setShowForm(true)}>
            <FiUserPlus /> Nouveau membre
          </button>
        </div>
      </header>

      <div className="dashboard-card tasks-table-card">
        <div className="tasks-table-wrapper">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Membre</th>
                <th>Poste</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Date d'entrée</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map((member) => (
                <tr key={member._id}>
                  <td>
                    <div className="team-workload-identity">
                      <div
                        className="avatar-circle"
                        style={{ backgroundColor: colorForName(member.nom) }}
                      >
                        {initials(member.nom)}
                      </div>
                      <span className="team-workload-name">{member.nom}</span>
                    </div>
                  </td>
                  <td>{member.poste || '—'}</td>
                  <td>
                    {member.email ? (
                      <a href={`mailto:${member.email}`} className="dashboard-card-link">
                        <FiMail style={{ verticalAlign: -2, marginRight: 4 }} />
                        {member.email}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {member.telephone ? (
                      <>
                        <FiPhone style={{ verticalAlign: -2, marginRight: 4 }} />
                        {member.telephone}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{formatDate(member.dateEntree)}</td>
                  <td>
                    <div className="tasks-table-actions">
                      <button
                        className="tasks-table-edit-btn"
                        onClick={() => setEditingMember(member)}
                        aria-label="Modifier le membre"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        className="tasks-table-delete-btn"
                        onClick={() => setDeletingMember(member)}
                        aria-label="Supprimer le membre"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {sortedMembers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Aucun membre pour le moment. Cliquez sur "Nouveau membre" pour en ajouter un.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <MemberFormModal projectId={currentProjectId} onClose={() => setShowForm(false)} onSaved={handleSaved} />
      )}

      {editingMember && (
        <MemberFormModal
          member={editingMember}
          projectId={currentProjectId}
          onClose={() => setEditingMember(null)}
          onSaved={handleSaved}
        />
      )}

      {deletingMember && (
        <ConfirmDialog
          title="Supprimer ce membre ?"
          message={`Cette action est irréversible. Le membre "${deletingMember.nom}" sera définitivement supprimé de l'équipe.`}
          confirmLabel="Supprimer"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingMember(null)}
          loading={isDeleting}
        />
      )}
    </DashboardLayout>
  )
}

export default Equipe
