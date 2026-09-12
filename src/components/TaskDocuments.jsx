import { useRef, useState } from 'react'
import { FiPaperclip, FiFile, FiImage, FiX, FiLoader } from 'react-icons/fi'
import { fetchWithAuth } from '../utils/api'

function DocumentIcon({ mimetype }) {
  if (mimetype === 'application/pdf') {
    return <FiFile className="document-icon document-icon-pdf" />
  }
  return <FiImage className="document-icon document-icon-image" />
}

function TaskDocuments({ task, onUpdated }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handlePickFile = () => {
    setError('')
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowed.includes(file.type)) {
      setError('Format non supporté (PDF, PNG, JPG, WEBP uniquement)')
      e.target.value = ''
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Fichier trop volumineux (10 Mo max)')
      e.target.value = ''
      return
    }

    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('document', file)

    try {
      const response = await fetchWithAuth(`/tasks/${task._id}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (!response) return

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Erreur lors de l'upload")
        setUploading(false)
        e.target.value = ''
        return
      }

      onUpdated(data)
      setUploading(false)
      e.target.value = ''
    } catch (err) {
      setError('Impossible de contacter le serveur')
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (docId) => {
    try {
      const response = await fetchWithAuth(`/tasks/${task._id}/documents/${docId}`, {
        method: 'DELETE',
      })

      if (!response) return

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Erreur lors de la suppression')
        return
      }

      onUpdated(data)
    } catch (err) {
      setError('Impossible de contacter le serveur')
    }
  }

  return (
    <div className="task-documents">
      <div className="task-documents-list">
        {(task.documents || []).map((doc) => (
          <span key={doc._id} className="task-document-chip">
            <a
              href={doc.path}
              target="_blank"
              rel="noopener noreferrer"
              className="task-document-link"
              title={doc.originalName}
            >
              <DocumentIcon mimetype={doc.mimetype} />
            </a>
            <button
              className="task-document-remove"
              onClick={() => handleDelete(doc._id)}
              aria-label="Supprimer le document"
            >
              <FiX />
            </button>
          </span>
        ))}

        <button
          className="task-document-upload-btn"
          onClick={handlePickFile}
          disabled={uploading}
          title="Ajouter un document"
          type="button"
        >
          {uploading ? <FiLoader className="spin" /> : <FiPaperclip />}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
      {error && <span className="task-document-error">{error}</span>}
    </div>
  )
}

export default TaskDocuments