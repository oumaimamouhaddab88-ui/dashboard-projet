import backgroundVideo from '../assets/backvid.mp4'
import logoOcp from '../assets/ocplogo.png'
import { TypeAnimation } from 'react-type-animation'

function HeroSection() {
  return (
    <div className="hero-section">
      <video
        className="hero-background"
        src={backgroundVideo}
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="hero-content">
        <img src={logoOcp} alt="Logo OCP" className="logo-ocp" />
        <h2 className="hero-tagline">
          <TypeAnimation
            sequence={[
              'Suivre, analyser et anticiper les projets de Grande Révision et de Réhabilitation des entités JPH.',
              2000,
              '',
              500,
            ]}
            speed={60}
            deletionSpeed={70}
            repeat={Infinity}
            cursor={true}
          />
        </h2>
      </div>
    </div>
  )
}

export default HeroSection