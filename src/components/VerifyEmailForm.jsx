import { useState, useRef, useEffect } from 'react'
import { FiMail, FiShield } from 'react-icons/fi'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import logoJph from '../assets/ocplogo.png'
import { API_BASE_URL } from '../utils/api'
function VerifyEmailForm() {
  const location = useLocation()
  const navigate = useNavigate()
  const email = location.state?.email || ''

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const inputsRef = useRef([])

  useEffect(() => {
    inputsRef.current[0]?.focus()
  }, [])

  const handleChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').trim()
    if (/^\d{6}$/.test(pasted)) {
      setCode(pasted.split(''))
      inputsRef.current[5]?.focus()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      setError('Veuillez saisir les 6 chiffres du code')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Code invalide')
        setLoading(false)
        return
      }

      setSuccess('Compte vérifié avec succès ! Redirection...')
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      setError('Impossible de contacter le serveur')
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setSuccess('')
    setResending(true)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Impossible de renvoyer le code")
        setResending(false)
        return
      }

      setSuccess('Nouveau code envoyé par e-mail')
      setResending(false)
    } catch (err) {
      setError('Impossible de contacter le serveur')
      setResending(false)
    }
  }

  return (
    <div className="auth-card fade-in">
      <div className="logo-container">
        <img src={logoJph} alt="Logo JPH" className="logo-jph" />
      </div>

      <h1 className="welcome-title">
        Vérifiez votre <span className="highlight-green">e-mail</span>
      </h1>
      <div className="title-underline"></div>

      <p className="welcome-text">
        <FiMail style={{ verticalAlign: 'middle', marginRight: '6px' }} />
        Un code à 6 chiffres a été envoyé à{' '}
        <strong>{email || 'votre adresse e-mail'}</strong>
      </p>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div className="code-input-group">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputsRef.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="code-input"
              aria-label={`Chiffre ${index + 1} du code`}
            />
          ))}
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Vérification...' : 'Vérifier le code'}
        </button>

        <div className="divider">
          <span>OU</span>
        </div>

        <p className="signup-text">
          Vous n'avez pas reçu de code ?{' '}
          <button
            type="button"
            className="signup-link resend-btn"
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? 'Envoi...' : 'Renvoyer le code'}
          </button>
        </p>

        <p className="signup-text">
          <Link to="/login" className="signup-link">
            Retour à la connexion
          </Link>
        </p>
      </form>

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

export default VerifyEmailForm