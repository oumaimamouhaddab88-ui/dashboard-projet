import SignupForm from '../components/SignupForm.jsx'
import backgroundVideo from '../assets/backvid.mp4'

function Signup() {
  return (
    <div className="signup-page">
      <video
        className="signup-page-background"
        src={backgroundVideo}
        autoPlay
        loop
        muted
        playsInline
      />
      <SignupForm />
    </div>
  )
}

export default Signup