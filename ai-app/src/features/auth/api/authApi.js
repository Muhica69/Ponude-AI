import { request } from '../../../api/client'

function login(credentials) {
  return request('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })
}

function getCurrentUser() {
  return request('/auth/me')
}

export { getCurrentUser, login }
