import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import DashboardLayout from '../components/DashboardLayout.jsx'
import ProjectCreateModal from '../components/ProjectCreateModal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { useProject } from '../context/ProjectContext.jsx'

function ProjectCard({ project, onOpen, onDeleteRequest }) {
  return (
    <button className="project-card" onClick={() => onOpen(project)}>
      {!project.isDefault && (
        <span
          className="project-card-delete-btn"
          onClick={(e) => {
            e.stopPropagation()
            onDeleteRequest(project)
          }}
          role="button"
          aria-label="Supprimer le projet"
          title="Supprimer ce projet"
        >
          <FiTrash2 />
        </span>
      )}
      <span className="project-card-title">{project.name}</span>
    </button>
  )
}

function NewProjectCard({ onClick }) {
  return (
    <button className="project-card project-card-new" onClick={onClick}>
      <FiPlus className="project-card-new-icon" />
      <span className="project-card-title">Nouveau projet</span>
    </button>
  )
}

function Projects() {
  const { projects, loading, error, selectProject, deleteProject } = useProject()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deletingProject, setDeletingProject] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const navigate = useNavigate()

  const handleOpen = (project) => {
    selectProject(project._id)
    navigate('/dashboard')
  }

  const handleDeleteConfirm = async () => {
    if (!deletingProject) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteProject(deletingProject._id)
      setIsDeleting(false)
      setDeletingProject(null)
    } catch (err) {
      setDeleteError(err.message || 'Erreur lors de la suppression')
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <p className="dashboard-loading">Chargement des projets...</p>
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
            <h1>Projets</h1>
            <p>
              {projects.length} projet{projects.length !== 1 ? 's' : ''} · cliquez sur un projet pour l'ouvrir
            </p>
          </div>
        </div>
      </header>

      <div className="project-cards-grid">
        {projects.map((project) => (
          <ProjectCard key={project._id} project={project} onOpen={handleOpen} onDeleteRequest={setDeletingProject} />
        ))}
        <NewProjectCard onClick={() => setShowCreateModal(true)} />
      </div>

      {showCreateModal && <ProjectCreateModal onClose={() => setShowCreateModal(false)} onCreated={handleOpen} />}

      {deletingProject && (
        <ConfirmDialog
          title="Supprimer ce projet ?"
          message={
            deleteError ||
            `Cette action est irréversible. Le projet "${deletingProject.name}" ainsi que toutes ses tâches, son budget, son équipe et ses fichiers seront définitivement supprimés.`
          }
          confirmLabel="Supprimer"
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setDeletingProject(null)
            setDeleteError('')
          }}
          loading={isDeleting}
        />
      )}
    </DashboardLayout>
  )
}

export default Projects