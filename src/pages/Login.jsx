import LoginForm from '../components/LoginForm.jsx'
import HeroSection from '../components/HeroSection.jsx'

function Login() {
  return (
    <div className="login-page">
      <div className="login-container fade-in">
        <LoginForm />
        <HeroSection />
      </div>
    </div>
  )
}

export default Login
