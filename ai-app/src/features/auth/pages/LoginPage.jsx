import { useState } from 'react'
import { login } from '../api/authApi'
import loginBackground from '../../../assets/background.jpg'
import saplastLogo from '../../../assets/image.png'

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const data = await login({ username, password })
      onLogin(data)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main
      className="login-shell"
      style={{ '--login-bg': `url(${loginBackground})` }}
    >
      <form className="login-panel" onSubmit={handleSubmit}>
        <div>
          <img className="login-logo" src={saplastLogo} alt="SAPLAST" />
          <p className="eyebrow">Pristup aplikaciji</p>
          <h1>Prijava</h1>
          <p className="lead">Unesi dodijeljene podatke za rad sa ponudama.</p>
        </div>

        <label>
          <span>Korisničko ime</span>
          <input
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>

        <label>
          <span>Lozinka</span>
          <input
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error && <div className="message error">{error}</div>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Provjera...' : 'Prijavi se'}
        </button>
      </form>
    </main>
  )
}

export default LoginPage
