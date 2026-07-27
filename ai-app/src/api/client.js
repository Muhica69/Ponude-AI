const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api')
const TOKEN_KEY = 'ai-offers-token'

function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY)
}

function setAuthToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function request(path, options = {}) {
  const token = getAuthToken()
  const headers = new Headers(options.headers || {})

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    })
  } catch {
    throw new Error('Ne mogu se povezati na API. Provjeri internet, HTTPS domenu i da backend radi.')
  }
  const contentType = response.headers.get('content-type') || ''
  const data = response.status === 204 || !contentType.includes('application/json')
    ? null
    : await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.message || 'Server nije vratio uspjesan odgovor.')
  }

  if (response.status !== 204 && !data) {
    throw new Error('API nije vratio JSON odgovor. Provjeri da /api ruta ide na backend, a ne na frontend.')
  }

  return data
}

export { clearAuthToken, getAuthToken, request, setAuthToken }
