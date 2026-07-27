import { useEffect, useState } from 'react'
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from './api/client'
import { getCurrentUser } from './features/auth/api/authApi'
import LoginPage from './features/auth/pages/LoginPage'
import OffersPage from './features/offers/pages/OffersPage'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(getAuthToken()))

  useEffect(() => {
    async function checkSession() {
      if (!getAuthToken()) {
        return
      }

      try {
        const data = await getCurrentUser()
        setUser(data.user)
      } catch {
        clearAuthToken()
      } finally {
        setIsCheckingSession(false)
      }
    }

    checkSession()
  }, [])

  function handleLogin(data) {
    if (!data?.token || !data?.user) {
      throw new Error('Login API nije vratio token. Provjeri backend /api/auth/login rutu.')
    }

    setAuthToken(data.token)
    setUser(data.user)
  }

  function handleLogout() {
    clearAuthToken()
    setUser(null)
  }

  if (isCheckingSession) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <p className="eyebrow">Sesija</p>
          <h1>Provjera prijave...</h1>
        </section>
      </main>
    )
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  return <OffersPage user={user} onLogout={handleLogout} />
}

export default App
