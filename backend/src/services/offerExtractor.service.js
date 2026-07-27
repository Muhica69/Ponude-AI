const fieldPatterns = {
  company: [
    /^Firma\s*\n\s*(.+)$/im,
    /^Gospodin\s*\n\s*(.+)$/im,
    /^Gospoda\s*\n\s*(.+)$/im,
    /^Kupac\s*\n\s*(.+)$/im,
    /^Company\s*\n\s*(.+)$/im,
    /^Customer\s*\n\s*(.+)$/im,
    /^Client\s*\n\s*(.+)$/im,
    /^Societe\s*\n\s*(.+)$/im,
    /^Entreprise\s*\n\s*(.+)$/im,
    /(?:firma|naziv\s+firme|kupac|investitor|klijent)[ \t]*[:\-][ \t]*(?!Br\.?)(.+)/i,
    /(?:company|customer|buyer|organization|organisation)[ \t]*[:\-][ \t]*(.+)/i,
    /(?:societe|entreprise|raison\s+sociale|nom\s+du\s+client)[ \t]*[:\-][ \t]*(.+)/i,
  ],
  project: [
    /(?:projekat|projekt|objekat|naziv\s+projekta)[ \t]*[:\-][ \t]*(.+)/i,
    /(?:project|job|site|object|building)[ \t]*[:\-][ \t]*(.+)/i,
    /(?:projet|chantier|ouvrage|objet)[ \t]*[:\-][ \t]*(.+)/i,
  ],
  system: [
    /(?:sistem|sustav|system)[ \t]*[:\-][ \t]*(.+)/i,
    /(?:systeme|profil|gamme)[ \t]*[:\-][ \t]*(.+)/i,
  ],
  offerNumber: [
    /Angebot\s+([0-9]+\s*\/\s*[0-9]+\s*-\s*[0-9]+)/i,
    /Ponuda\s*:\s*([0-9]+\s*\/\s*[0-9]+\s*-\s*[0-9]+)/i,
    /Num[eé]ro d[' ]offre\s*:\s*([0-9]+\s*\/\s*[0-9]+\s*-\s*[0-9]+)/i,
    /Num[eé]ro d[' ]offre\s*:\s*([0-9]+\s*-\s*[0-9]+)/i,
    /Ponuda\s*:\s*([A-Z0-9\-\/.\s]+)/i,
    /(?:br\.?\s*ponude|broj\s+ponude|ponuda\s+br\.?)[ \t]*[:\-]?[ \t]*([A-Z0-9\-\/.]+)/i,
    /(?:offer|quote|quotation|estimate|proposal)\s*(?:no\.?|number|#|br\.?)?[ \t]*[:\-]?[ \t]*([A-Z0-9\-\/.]+)/i,
    /(?:devis|offre|numero\s+d[' ]offre|no\.?\s*d[' ]offre|n\s*d[' ]offre)[ \t]*[:\-]?[ \t]*([A-Z0-9\-\/.]+)/i,
    /Angebot\s+([0-9]+\s*-\s*[0-9]+)/i,
  ],
  elementCount: [
    /(?:br\.?\s*elemenata|broj\s+elemenata|elemenata|kolicina\s+elemenata)[ \t]*[:\-][ \t]*(\d+)/i,
    /Anzahl\s+Elemente\s*:\s*(\d+)/i,
    /Nombre d[' ]unit[eé]s\s*:\s*(\d+)/i,
    /(?:number\s+of\s+elements|elements|element\s+count|quantity\s+of\s+elements)[ \t]*[:\-][ \t]*(\d+)/i,
    /(?:nombre\s+d[' ]elements|nb\.?\s+d[' ]elements|quantite\s+d[' ]elements|elements)[ \t]*[:\-][ \t]*(\d+)/i,
  ],
  amount: [
    /(?:ukupan\s+iznos|ukupno|iznos|total|sveukupno)[ \t]*[:\-]?[ \t]*([\d.'`\s,]+)\s*(?:KM|BAM|EUR|USD|CHF|GBP)?/i,
    /(?:total\s+amount|grand\s+total|amount\s+due|total)[ \t]*[:\-]?[ \t]*([\d.'`\s,]+)\s*(?:BAM|EUR|USD|CHF|GBP)?/i,
    /(?:montant\s+total|total\s+general|total\s+ttc|montant|somme\s+totale)[ \t]*[:\-]?[ \t]*([\d.'`\s,]+)\s*(?:EUR|BAM|USD|CHF|GBP)?/i,
    /(?:Gesamtbetrag|Gesamtsumme|Endbetrag)\s+([\d.'`\s,]+)\s*(?:EUR|BAM|USD|CHF|GBP)?/i,
  ],
  operator: [
    /(?:operater|operator|komercijalista|komercij\.?\s*obrada|obradio|pripremio|izradio)[ \t]*[:\-][ \t]*(.+)/i,
    /(?:operator|prepared\s+by|processed\s+by|salesperson|representative|created\s+by)[ \t]*[:\-][ \t]*(.+)/i,
    /(?:utilisateur|operateur|prepare\s+par|etabli\s+par|traite\s+par|commercial|responsable)[ \t]*[:\-][ \t]*(.+)/i,
    /Sachbearb(?:e)?arbeiter\s*:\s*(.+)/i,
  ],
}

const knownCompanies = [
  'SPI Batignolles',
  'Bouygues',
  'EBPS',
  'ERPS',
  'Eiffage',
  'ELOGIE SIEMP',
  'GTM',
  'MDN',
  'SABP',
  'SICRA',
  'SNERCT',
  'Vendors',
  'VINCI',
]

function normalizeText(text) {
  return text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function readFirstLine(value = '') {
  return value.split('\n')[0].trim().replace(/\s{2,}/g, ' ')
}

function normalizeSearchValue(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildKnownCompanyList(extraKnownCompanies = []) {
  const companiesByKey = new Map()

  for (const company of [...knownCompanies, ...extraKnownCompanies]) {
    const cleanCompany = readFirstLine(company)

    if (!cleanCompany) {
      continue
    }

    companiesByKey.set(normalizeSearchValue(cleanCompany), cleanCompany)
  }

  return [...companiesByKey.values()]
}

function splitByKnownCompany(value, extraKnownCompanies = []) {
  const cleanValue = readFirstLine(value)
  const searchableValue = normalizeSearchValue(cleanValue)
  const matches = buildKnownCompanyList(extraKnownCompanies)
    .map((company) => {
      const normalizedCompany = normalizeSearchValue(company)
      const pattern = new RegExp(
        `(^|[^a-z0-9])(${escapeRegExp(normalizedCompany)})`,
        'i',
      )
      const match = searchableValue.match(pattern)

      return {
        company,
        index: match ? match.index + match[1].length : -1,
      }
    })
    .filter((match) => match.index >= 0)
    .sort((a, b) => a.index - b.index || b.company.length - a.company.length)

  const match = matches[0]

  if (!match) {
    return {
      company: '',
      project: cleanValue,
    }
  }

  const cleanupProjectPart = (part) => part.replace(/^[\s-]+|[\s-]+$/g, '').trim()
  const before = cleanupProjectPart(cleanValue.slice(0, match.index))
  const after = cleanupProjectPart(cleanValue.slice(match.index + match.company.length))

  return {
    company: match.company,
    project: [before, after].filter(Boolean).join(' '),
  }
}

function findValue(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      const value = readFirstLine(match[1])

      if (value) {
        return value
      }
    }
  }

  return ''
}

function parseNumber(value) {
  if (!value) {
    return null
  }

  const compact = value.replace(/['`\s]/g, '').replace(/[^\d.,-]/g, '')
  const lastComma = compact.lastIndexOf(',')
  const lastDot = compact.lastIndexOf('.')
  let normalized = compact

  if (lastComma > -1 && lastDot > -1) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.'
    normalized =
      decimalSeparator === ','
        ? compact.replace(/\./g, '').replace(',', '.')
        : compact.replace(/,/g, '')
  } else if (lastComma > -1) {
    const decimals = compact.length - lastComma - 1
    normalized =
      decimals === 3 ? compact.replace(/,/g, '') : compact.replace(',', '.')
  } else if (lastDot > -1) {
    const decimals = compact.length - lastDot - 1
    normalized = decimals === 3 ? compact.replace(/\./g, '') : compact
  }

  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeOfferNumber(value) {
  const normalized = value.replace(/\s*-\s*/g, '-').replace(/\s*\/\s*/g, ' / ').trim()
  const offerNumberMatch = normalized.match(/(?:^|[\s/])\d{2}-(\d{4,})\b/)

  if (offerNumberMatch?.[1]) {
    return offerNumberMatch[1]
  }

  return normalized
}

function findCurrency(text) {
  const match = text.match(
    /(?:Gesamtbetrag|Gesamtsumme|Positionssumme|Einzelpreis|iznos|ukupno|total|montant|somme)[^\n]*\b(EUR|BAM|KM|USD|CHF|GBP)\b/i,
  )
  const currency = match?.[1]?.toUpperCase()

  if (currency === 'KM') {
    return 'BAM'
  }

  return currency || ''
}

function findMostCommonValue(text, pattern) {
  const counts = new Map()
  let match = pattern.exec(text)

  while (match) {
    const value = readFirstLine(match[1])
    counts.set(value, (counts.get(value) || 0) + 1)
    match = pattern.exec(text)
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || ''
}

function parseOfferDateValue(value) {
  if (!value) {
    return null
  }

  const match = value.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/)

  if (!match) {
    return null
  }

  const day = Number(match[1])
  const month = Number(match[2])
  const rawYear = Number(match[3])
  const year = rawYear < 100 ? 2000 + rawYear : rawYear
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

function findOfferDate(text) {
  const datePatterns = [
    /(?:Date du document|datum\s+ponude|datum\s+izrade|offer\s+date|quotation\s+date|date\s+du\s+devis|date\s+d[' ]offre|eingangsdatum)[ \t]*[:\-]?[ \t]*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i,
    /(?:Sarajevo,\s*)?(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(?:Ponuda|Angebot|Offer|Quote|Quotation|Devis|Offre|Num[eé]ro d[' ]offre)\b/i,
    /(?:Ponuda|Angebot|Offer|Quote|Quotation|Devis|Offre|Num[eé]ro d[' ]offre)[^\n]*?(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i,
    /(?:datum|date)[ \t]*[:\-]?[ \t]*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i,
  ]

  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    const date = parseOfferDateValue(match?.[1])

    if (date) {
      return date
    }
  }

  return null
}

function splitCompanyAndProjectFromFirmaBlock(text, company, project, extraKnownCompanies = []) {
  if (project || !company) {
    return { company, project }
  }

  const firmaMatch = text.match(/^Firma\s*\n\s*(.+)$/im)

  if (!firmaMatch || readFirstLine(firmaMatch[1]) !== company) {
    return { company, project }
  }

  return splitByKnownCompany(company, extraKnownCompanies)
}

function findEnterpriseChantierHeader(text, extraKnownCompanies = []) {
  const match = text.match(/^Enterprise\s*\n\s*(?:Chantier\s+)?(.+)$/im)

  if (!match?.[1]) {
    return null
  }

  return splitByKnownCompany(match[1], extraKnownCompanies)
}

function extractOfferFields(rawText, options = {}) {
  const text = normalizeText(rawText)
  const extraKnownCompanies = options.knownCompanies || []
  const enterpriseHeader = findEnterpriseChantierHeader(text, extraKnownCompanies)
  const company = enterpriseHeader?.company || findValue(text, fieldPatterns.company)
  const project = enterpriseHeader?.project || findValue(text, fieldPatterns.project)
  const companyProject = enterpriseHeader || splitCompanyAndProjectFromFirmaBlock(
    text,
    company,
    project,
    extraKnownCompanies,
  )

  const extracted = {
    company: companyProject.company,
    project: companyProject.project,
    system:
      findMostCommonValue(text, /(?:System|Sistem|Systeme):\s*(.+)/gi) ||
      findValue(text, fieldPatterns.system),
    offerNumber: normalizeOfferNumber(findValue(text, fieldPatterns.offerNumber)),
    offerDate: findOfferDate(text),
    elementCount: parseNumber(findValue(text, fieldPatterns.elementCount)),
    amount: parseNumber(findValue(text, fieldPatterns.amount)),
    currency: findCurrency(text),
    operator: findValue(text, fieldPatterns.operator),
  }

  return {
    ...extracted,
    rawText: text,
  }
}

module.exports = {
  extractOfferFields,
}
