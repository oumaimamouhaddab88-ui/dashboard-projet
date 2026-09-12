import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchWithAuth } from '../utils/api'

const ProjectContext = createContext(null)

const STORAGE_KEY = 'currentProjectId'

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [currentProjectId, setCurrentProjectId] = useState(() => localStorage.getItem(STORAGE_KEY) || null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      await fetchWithAuth('/projects/ensure-default')

      const response = await fetchWithAuth('/projects')
      if (!response) return
      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Erreur lors du chargement des projets')
        setLoading(false)
        return
      }

      setProjects(data)

      setCurrentProjectId((prev) => {
        const stillExists = prev && data.some((p) => p._id === prev)
        if (stillExists) return prev
        const defaultProject = data.find((p) => p.isDefault) || data[0]
        return defaultProject ? defaultProject._id : null
      })

      setLoading(false)
    } catch (err) {
      setError('Impossible de contacter le serveur')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    if (currentProjectId) {
      localStorage.setItem(STORAGE_KEY, currentProjectId)
    }
  }, [currentProjectId])

  const selectProject = useCallback((projectId) => {
    setCurrentProjectId(projectId)
  }, [])

  const createProject = useCallback(async ({ name, description, color }) => {
    const response = await fetchWithAuth('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description, color }),
    })
    if (!response) return null
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Erreur lors de la création du projet')
    }
    setProjects((prev) => [...prev, data])
    return data
  }, [])

  // Supprime un projet. Le projet "Bac" (isDefault) ne peut jamais être
  // supprimé — le backend le refuse déjà (403), on relaie juste le message.
  const deleteProject = useCallback(
    async (projectId) => {
      const response = await fetchWithAuth(`/projects/${projectId}`, { method: 'DELETE' })
      if (!response) return
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la suppression du projet')
      }
      setProjects((prev) => prev.filter((p) => p._id !== projectId))
      setCurrentProjectId((prev) => {
        if (prev !== projectId) return prev
        const remaining = projects.filter((p) => p._id !== projectId)
        const fallback = remaining.find((p) => p.isDefault) || remaining[0]
        return fallback ? fallback._id : null
      })
    },
    [projects]
  )

  const currentProject = projects.find((p) => p._id === currentProjectId) || null

  // useMemo : évite de recréer un nouvel objet `value` à chaque render du
  // Provider, ce qui évite de re-render tous les consommateurs de
  // useProject() qui ne sont pas concernés par le changement.
  const value = useMemo(
    () => ({
      projects,
      currentProject,
      currentProjectId,
      loading,
      error,
      selectProject,
      createProject,
      deleteProject,
      refreshProjects: loadProjects,
    }),
    [
      projects,
      currentProject,
      currentProjectId,
      loading,
      error,
      selectProject,
      createProject,
      deleteProject,
      loadProjects,
    ]
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) {
    throw new Error('useProject() doit être utilisé à l’intérieur de <ProjectProvider>')
  }
  return ctx
}