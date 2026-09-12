import { Navigate, useLocation } from 'react-router-dom'

// Bloque l'accès à une route si l'utilisateur n'est pas connecté (pas de token en localStorage).
// Redirige vers /login en gardant l'URL demandée dans le state, pour pouvoir y renvoyer
// l'utilisateur une fois connecté si tu veux ajouter ce comportement plus tard.
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token')
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export default ProtectedRoute
