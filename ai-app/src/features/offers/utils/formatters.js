function formatCurrency(value, currency = 'BAM') {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  const normalizedCurrency = currency || 'BAM'

  return new Intl.NumberFormat('bs-BA', {
    style: 'currency',
    currency: normalizedCurrency,
  }).format(Number(value))
}

const EUR_RATES = {
  EUR: 1,
  BAM: 1 / 1.95583,
  KM: 1 / 1.95583,
}

function convertToEur(value, currency = 'BAM') {
  const rate = EUR_RATES[currency || 'BAM']

  if (!rate || value === null || value === undefined || value === '') {
    return null
  }

  return Number(value) * rate
}

function formatEur(value, currency = 'BAM') {
  const eurValue = convertToEur(value, currency)
  return eurValue === null ? '-' : formatCurrency(eurValue, 'EUR')
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}

function formatOfferNumber(value) {
  if (!value) {
    return '-'
  }

  const normalized = String(value)
    .replace(/\s*-\s*/g, '-')
    .replace(/\s*\/\s*/g, ' / ')
    .trim()
  const offerNumberMatch = normalized.match(/(?:^|[\s/])\d{2}-(\d{4,})\b/)

  return offerNumberMatch?.[1] || normalized
}

export { convertToEur, formatCurrency, formatDate, formatEur, formatOfferNumber }
