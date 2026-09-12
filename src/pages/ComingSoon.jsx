import { FiTool } from 'react-icons/fi'

function ComingSoon({ title }) {
  return (
    <div className="coming-soon">
      <FiTool className="coming-soon-icon" />
      <h1>{title}</h1>
      <p>Cette section est en cours de développement.</p>
    </div>
  )
}

export default ComingSoon
