import { useState } from 'react'
import { FiEye, FiEyeOff, FiMail, FiLock, FiShield } from 'react-icons/fi'
import logoJph from '../assets/ocplogo.png'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../utils/api'

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Une erreur est survenue')
        setLoading(false)
        return
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      navigate('/dashboard')
    } catch (err) {
      setError('Impossible de contacter le serveur')
      setLoading(false)
    }
  }

  return (
    <div className="login-form-section">
      <div className="login-form-wrapper">
        <div className="logo-container">
          <img src={logoJph} alt="Logo OCP" className="logo-jph" />
        </div>

        <h1 className="welcome-title">
          <span className="highlight-green">Bienvenue !</span>
        </h1>

        <div className="title-underline"></div>

        {error && <p className="form-error">{error}</p>}

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Adresse e-mail</label>

            <div className="input-wrapper">
              <FiMail className="input-icon" />

              <input
                type="email"
                id="email"
                placeholder="exemple@ocpgroup.ma"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>

            <div className="input-wrapper">
              <FiLock className="input-icon" />

              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword
                    ? 'Masquer le mot de passe'
                    : 'Afficher le mot de passe'
                }
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <div className="form-options">
            <a href="#" className="forgot-link">
              Mot de passe oublié ?
            </a>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <div className="divider">
            <span>OU</span>
          </div>

          <p className="signup-text">
            Vous n'avez pas de compte ?{' '}
            <Link to="/register" className="signup-link">
              Créer un compte
            </Link>
          </p>
        </form>
      </div>

      <div className="login-footer">
        <p className="security-text">
          <FiShield className="security-icon" />
          Sécurité et confidentialité garanties
        </p>

        <p className="copyright-text">
          &copy; {new Date().getFullYear()} OCP Group. Tous droits réservés.
        </p>
      </div>
    </div>
  )
}

export default LoginForm