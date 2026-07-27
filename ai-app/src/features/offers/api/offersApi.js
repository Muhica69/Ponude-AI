import { getAuthToken, request } from '../../../api/client'

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api')

function getOffers() {
  return request('/offers')
}

function uploadOfferPdf(file) {
  const formData = new FormData()
  formData.append('offerPdf', file)

  return request('/offers/upload', {
    method: 'POST',
    body: formData,
  })
}

function uploadTrackingPdf(id, field, file) {
  const formData = new FormData()
  formData.append('trackingPdf', file)

  return request(`/offers/${id}/tracking-pdfs/${field}`, {
    method: 'POST',
    body: formData,
  })
}

function createOffer(payload) {
  return request('/offers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

function updateOffer(id, payload) {
  return request(`/offers/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

function deleteOffer(id) {
  return request(`/offers/${id}`, {
    method: 'DELETE',
  })
}

async function openOfferPdf(id) {
  return openPdfPath(`/offers/${id}/pdf`, 'PDF nije moguce otvoriti.')
}

async function openTrackingPdf(id, field) {
  return openPdfPath(
    `/offers/${id}/tracking-pdfs/${field}`,
    'PDF prilog nije moguce otvoriti.',
  )
}

async function openPdfPath(path, fallbackMessage) {
  const token = getAuthToken()
  const headers = new Headers()

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_URL}${path}`, { headers })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.message || fallbackMessage)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export {
  createOffer,
  deleteOffer,
  getOffers,
  openOfferPdf,
  openTrackingPdf,
  uploadOfferPdf,
  uploadTrackingPdf,
  updateOffer,
}
