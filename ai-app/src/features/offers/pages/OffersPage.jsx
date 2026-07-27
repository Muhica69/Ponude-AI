import { useEffect, useState } from 'react'
import OfferDetailsForm from '../components/OfferDetailsForm'
import OfferDetailsView from '../components/OfferDetailsView'
import OfferTrackingView from '../components/OfferTrackingView'
import OffersTable from '../components/OffersTable'
import OfferUploadForm from '../components/OfferUploadForm'
import {
  createOffer,
  deleteOffer,
  getOffers,
  openOfferPdf,
  openTrackingPdf,
  updateOffer,
  uploadOfferPdf,
  uploadTrackingPdf,
} from '../api/offersApi'
import saplastLogo from '../../../assets/image.png'
import { convertToEur, formatCurrency, formatOfferNumber } from '../utils/formatters'

const requiredSaveFields = [
  ['project', 'Projekat'],
  ['system', 'Sistem'],
  ['offerNumber', 'Broj ponude'],
  ['offerDate', 'Datum ponude'],
  ['elementCount', 'Broj elemenata'],
  ['amount', 'Iznos'],
  ['currency', 'Valuta'],
  ['operator', 'Operater'],
  ['checkedBy', 'Provjera'],
  ['sentTo', 'Poslano'],
]

const trackingFieldOrder = [
  'offerSent',
  'samplePlans',
  'sampleRn',
  'samplesDone',
  'samplesSent',
  'offerAccepted',
]

const requiredTrackingPdfFields = new Set(['samplePlans', 'sampleRn'])

function findMissingSaveFields(offer) {
  return requiredSaveFields
    .filter(([field]) => {
      const value = offer?.[field]
      return value === null || value === undefined || value === ''
    })
    .map(([, label]) => label)
}

function buildSavePayload(offer) {
  const { rawText: _rawText, ...payload } = offer
  return payload
}

function readDateValue(value) {
  if (!value) {
    return ''
  }

  return new Date(value).toISOString().slice(0, 10)
}

function normalizeProjectName(value) {
  return String(value || '').trim().toLowerCase()
}

function sumOfferAmounts(offersToSum) {
  return offersToSum.reduce(
    (sum, offer) => sum + (convertToEur(offer.amount, offer.currency) || 0),
    0,
  )
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return '0%'
  }

  return `${Math.round(value)}%`
}

function readMonthKey(value) {
  if (!value) {
    return 'Bez datuma'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Bez datuma'
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function readMonthLabel(monthKey) {
  if (monthKey === 'Bez datuma') {
    return monthKey
  }

  const [year, month] = monthKey.split('-')
  return `${month}/${year}`
}

function countByText(offersToCount, field) {
  const counts = new Map()

  for (const offer of offersToCount) {
    const value = String(offer[field] || '').trim() || 'Nije uneseno'
    const current = counts.get(value) || { count: 0, total: 0 }

    counts.set(value, {
      count: current.count + 1,
      total: current.total + (convertToEur(offer.amount, offer.currency) || 0),
    })
  }

  return [...counts.entries()]
    .map(([label, data]) => ({ label, ...data }))
    .sort((first, second) => second.count - first.count || second.total - first.total)
}

function buildMonthlyStats(offersToCount) {
  const counts = new Map()

  for (const offer of offersToCount) {
    const monthKey = readMonthKey(offer.offerDate || offer.createdAt)
    const current = counts.get(monthKey) || { count: 0, total: 0 }

    counts.set(monthKey, {
      count: current.count + 1,
      total: current.total + (convertToEur(offer.amount, offer.currency) || 0),
    })
  }

  return [...counts.entries()]
    .map(([monthKey, data]) => ({
      label: readMonthLabel(monthKey),
      sortKey: monthKey,
      ...data,
    }))
    .sort((first, second) => second.sortKey.localeCompare(first.sortKey))
    .slice(0, 6)
}

function readPercentValue(value, maxValue) {
  if (!maxValue || !Number.isFinite(value)) {
    return 0
  }

  return Math.max(4, Math.round((value / maxValue) * 100))
}

function OffersPage({ user, onLogout }) {
  const [offers, setOffers] = useState([])
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [activeView, setActiveView] = useState('overview')
  const [detailsBackView, setDetailsBackView] = useState('overview')
  const [offerFilters, setOfferFilters] = useState({
    query: '',
    operator: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  })
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTrackingSaving, setIsTrackingSaving] = useState(false)
  const [uploadingPdfField, setUploadingPdfField] = useState('')
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isMobileUserOpen, setIsMobileUserOpen] = useState(false)

  useEffect(() => {
    loadOffers()
  }, [])

  useEffect(() => {
    if (!status) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setStatus('')
    }, 3000)

    return () => window.clearTimeout(timeoutId)
  }, [status])

  async function loadOffers() {
    try {
      const data = await getOffers()
      setOffers(data)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleUpload(file) {
    setError('')
    setStatus('')
    setIsUploading(true)

    try {
      const extractedOffer = await uploadOfferPdf(file)
      const offerWithDefaults = {
        status: 'cekanju',
        checkedBy: '',
        sentTo: '',
        ...extractedOffer,
      }
      setSelectedOffer(offerWithDefaults)
      setActiveView('add')
      setStatus(
        'Ponuda je učitana za provjeru. Nije spremljena dok ne popuniš sva polja i klikneš Spremi.',
      )
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsUploading(false)
    }
  }

  function handleFieldChange(field, value) {
    const nextValue =
      field === 'elementCount' || field === 'amount'
        ? value === ''
          ? ''
          : Number(value)
        : value

    setSelectedOffer((currentOffer) => ({
      ...currentOffer,
      [field]: nextValue,
    }))
  }

  function handleFilterChange(field, value) {
    setOfferFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }))
  }

  function clearOfferFilters() {
    setOfferFilters({
      query: '',
      operator: '',
      status: '',
      dateFrom: '',
      dateTo: '',
    })
  }

  function openView(view) {
    setActiveView(view)
    setIsMobileNavOpen(false)
    setIsMobileUserOpen(false)
  }

  async function handleSave(event) {
    event.preventDefault()

    if (!selectedOffer) {
      return
    }

    setError('')
    setStatus('')

    const missingFields = findMissingSaveFields(selectedOffer)

    if (missingFields.length > 0) {
      setError(`Popuni sva polja prije spremanja: ${missingFields.join(', ')}.`)
      return
    }

    setIsSaving(true)

    try {
      if (selectedOffer._id) {
        const updatedOffer = await updateOffer(
          selectedOffer._id,
          buildSavePayload(selectedOffer),
        )
        setSelectedOffer(updatedOffer)
        setOffers((currentOffers) =>
          currentOffers.map((offer) =>
            offer._id === updatedOffer._id ? updatedOffer : offer,
          ),
        )
        setStatus('Izmjene su spremljene.')
      } else {
        const createdOffer = await createOffer(buildSavePayload(selectedOffer))
        setSelectedOffer(null)
        const createdProject = normalizeProjectName(createdOffer.project)
        const createdOfferNumber = String(createdOffer.offerNumber || '').trim()
        setOffers((currentOffers) => [
          createdOffer,
          ...currentOffers.map((offer) =>
            createdProject &&
            normalizeProjectName(offer.project) === createdProject &&
            String(offer.offerNumber || '').trim() !== createdOfferNumber &&
            offer.status !== 'prihvaceno'
              ? {
                  ...offer,
                  status: 'odbijeno',
                  replacementInfo: {
                    replacedByOfferNumber: createdOffer.offerNumber,
                    replacedAt: new Date().toISOString(),
                  },
                }
              : offer,
          ),
        ])
        setStatus('Ponuda je spremljena.')
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(offerToDelete) {
    setError('')
    setStatus('')

    try {
      await deleteOffer(offerToDelete._id)
      setOffers((currentOffers) =>
        currentOffers.filter((offer) => offer._id !== offerToDelete._id),
      )

      if (selectedOffer?._id === offerToDelete._id) {
        setSelectedOffer(null)
      }

      setStatus('Ponuda je obrisana.')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleStatusChange(offerToUpdate, nextStatus) {
    setError('')
    setStatus('')

    const previousOffers = offers
    const previousSelectedOffer = selectedOffer
    const optimisticOffer = { ...offerToUpdate, status: nextStatus }

    setOffers((currentOffers) =>
      currentOffers.map((offer) =>
        offer._id === offerToUpdate._id ? optimisticOffer : offer,
      ),
    )

    if (selectedOffer?._id === offerToUpdate._id) {
      setSelectedOffer((currentOffer) => ({
        ...currentOffer,
        status: nextStatus,
      }))
    }

    try {
      const updatedOffer = await updateOffer(offerToUpdate._id, {
        checkedBy: offerToUpdate.checkedBy,
        sentTo: offerToUpdate.sentTo,
        status: nextStatus,
      })

      setOffers((currentOffers) =>
        currentOffers.map((offer) =>
          offer._id === updatedOffer._id ? updatedOffer : offer,
        ),
      )

      if (selectedOffer?._id === updatedOffer._id) {
        setSelectedOffer(updatedOffer)
      }
    } catch (requestError) {
      setOffers(previousOffers)
      setSelectedOffer(previousSelectedOffer)
      setError(requestError.message)
    }
  }

  async function handleOpenPdf(offer) {
    setError('')
    setStatus('')

    try {
      await openOfferPdf(offer._id)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleOpenTrackingPdf(field) {
    if (!selectedOffer?._id) {
      return
    }

    await handleOpenTrackingPdfForOffer(selectedOffer, field)
  }

  async function handleOpenTrackingPdfForOffer(offer, field) {
    if (!offer?._id) {
      return
    }

    setError('')
    setStatus('')

    try {
      await openTrackingPdf(offer._id, field)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleSaveComment(offerToUpdate, comment) {
    if (!offerToUpdate?._id) {
      return false
    }

    setError('')
    setStatus('')

    const previousOffers = offers
    const previousSelectedOffer = selectedOffer
    const optimisticOffer = { ...offerToUpdate, comment }

    setSelectedOffer(optimisticOffer)
    setOffers((currentOffers) =>
      currentOffers.map((offer) =>
        offer._id === optimisticOffer._id ? optimisticOffer : offer,
      ),
    )

    try {
      const updatedOffer = await updateOffer(offerToUpdate._id, {
        checkedBy: offerToUpdate.checkedBy,
        sentTo: offerToUpdate.sentTo,
        status: offerToUpdate.status || 'cekanju',
        comment,
      })

      setSelectedOffer(updatedOffer)
      setOffers((currentOffers) =>
        currentOffers.map((offer) =>
          offer._id === updatedOffer._id ? updatedOffer : offer,
        ),
      )
      setStatus('Komentar je sacuvan.')
      return true
    } catch (requestError) {
      setOffers(previousOffers)
      setSelectedOffer(previousSelectedOffer)
      setError(requestError.message)
      return false
    }
  }

  async function handleSaveDetailFields(offerToUpdate, detailUpdates) {
    if (!offerToUpdate?._id) {
      return false
    }

    setError('')
    setStatus('')

    const previousOffers = offers
    const previousSelectedOffer = selectedOffer
    const optimisticOffer = {
      ...offerToUpdate,
      ...detailUpdates,
    }

    setSelectedOffer(optimisticOffer)
    setOffers((currentOffers) =>
      currentOffers.map((offer) =>
        offer._id === optimisticOffer._id ? optimisticOffer : offer,
      ),
    )

    try {
      const updatedOffer = await updateOffer(offerToUpdate._id, {
        checkedBy: offerToUpdate.checkedBy,
        sentTo: detailUpdates.sentTo ?? offerToUpdate.sentTo,
        status: offerToUpdate.status || 'cekanju',
        company: detailUpdates.company ?? offerToUpdate.company,
        project: detailUpdates.project ?? offerToUpdate.project,
        system: detailUpdates.system ?? offerToUpdate.system,
        operator: detailUpdates.operator ?? offerToUpdate.operator,
      })

      setSelectedOffer(updatedOffer)
      setOffers((currentOffers) =>
        currentOffers.map((offer) =>
          offer._id === updatedOffer._id ? updatedOffer : offer,
        ),
      )
      setStatus('Izmjene su sacuvane.')
      return true
    } catch (requestError) {
      setOffers(previousOffers)
      setSelectedOffer(previousSelectedOffer)
      setError(requestError.message)
      return false
    }
  }

  async function handleTrackingPdfUpload(field, file) {
    if (!selectedOffer?._id) {
      return
    }

    setError('')
    setStatus('')
    setUploadingPdfField(field)

    try {
      const updatedOffer = await uploadTrackingPdf(selectedOffer._id, field, file)
      setSelectedOffer(updatedOffer)
      setOffers((currentOffers) =>
        currentOffers.map((offer) =>
          offer._id === updatedOffer._id ? updatedOffer : offer,
        ),
      )
      setStatus('PDF prilog je sacuvan.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setUploadingPdfField('')
    }
  }

  function handleTrackOffer(offer) {
    setSelectedOffer(offer)
    setActiveView('tracking')
  }

  function handleViewOffer(offer) {
    setSelectedOffer(offer)
    setDetailsBackView(activeView)
    setActiveView('details')
  }

  async function handleTrackingChange(field, checked) {
    if (!selectedOffer?._id) {
      return
    }

    setError('')
    setStatus('')

    const previousOffer = selectedOffer
    const currentTracking = {
      offerSent: true,
      ...(selectedOffer.tracking || {}),
    }
    const currentTrackingDates = {
      ...(selectedOffer.trackingDates || {}),
      offerSent: selectedOffer.createdAt || selectedOffer.trackingDates?.offerSent || new Date().toISOString(),
    }
    const fieldIndex = trackingFieldOrder.indexOf(field)
    const previousFieldsDone = trackingFieldOrder
      .slice(0, fieldIndex)
      .every((trackingField) => Boolean(currentTracking[trackingField]))
    const laterFieldsDone = trackingFieldOrder
      .slice(fieldIndex + 1)
      .some((trackingField) => Boolean(currentTracking[trackingField]))
    const needsPdf = requiredTrackingPdfFields.has(field)
    const hasPdf = Boolean(selectedOffer.trackingPdfs?.[field]?.pdfFileName)

    if (
      fieldIndex <= 0 ||
      (checked && (!previousFieldsDone || (needsPdf && !hasPdf))) ||
      (!checked && laterFieldsDone)
    ) {
      if (checked && needsPdf && !hasPdf) {
        setError('Dodaj PDF prilog prije cekiranja ovog koraka.')
      }
      return
    }

    const nextTracking = {
      offerSent: true,
      ...currentTracking,
      [field]: checked,
    }
    const nextTrackingDates = {
      ...currentTrackingDates,
      [field]: checked ? new Date().toISOString() : null,
      offerSent: selectedOffer.createdAt || currentTrackingDates.offerSent,
    }
    const nextStatus =
      field === 'offerAccepted' && checked ? 'prihvaceno' : selectedOffer.status
    const optimisticOffer = {
      ...selectedOffer,
      status: nextStatus,
      tracking: nextTracking,
      trackingDates: nextTrackingDates,
    }

    setSelectedOffer(optimisticOffer)
    setOffers((currentOffers) =>
      currentOffers.map((offer) =>
        offer._id === optimisticOffer._id ? optimisticOffer : offer,
      ),
    )
    setIsTrackingSaving(true)

    try {
      const updatedOffer = await updateOffer(selectedOffer._id, {
        checkedBy: selectedOffer.checkedBy,
        sentTo: selectedOffer.sentTo,
        status: nextStatus,
        tracking: nextTracking,
        trackingDates: nextTrackingDates,
      })

      setSelectedOffer(updatedOffer)
      setOffers((currentOffers) =>
        currentOffers.map((offer) =>
          offer._id === updatedOffer._id ? updatedOffer : offer,
        ),
      )
    } catch (requestError) {
      setSelectedOffer(previousOffer)
      setOffers((currentOffers) =>
        currentOffers.map((offer) =>
          offer._id === previousOffer._id ? previousOffer : offer,
        ),
      )
      setError(requestError.message)
    } finally {
      setIsTrackingSaving(false)
    }
  }

  const pendingOffersCount = offers.filter(
    (offer) => (offer.status || 'cekanju') === 'cekanju',
  ).length
  const rejectedOffersCount = offers.filter(
    (offer) => offer.status === 'odbijeno',
  ).length
  const acceptedOffersCount = offers.filter(
    (offer) => offer.status === 'prihvaceno',
  ).length
  const activeOffers = offers.filter((offer) => offer.status === 'aktivno')
  const acceptedOffers = offers.filter((offer) => offer.status === 'prihvaceno')
  const selectedProject = normalizeProjectName(selectedOffer?.project)
  const relatedProjectOffers = selectedProject
    ? offers.filter(
        (offer) =>
          offer._id !== selectedOffer?._id &&
          normalizeProjectName(offer.project) === selectedProject,
      )
    : []
  const activeProjectOffer = selectedProject
    ? offers.find(
        (offer) =>
          normalizeProjectName(offer.project) === selectedProject &&
          offer.status === 'aktivno',
      )
    : null
  const operatorOptions = [...new Set(
    offers
      .map((offer) => offer.operator?.trim())
      .filter(Boolean),
  )].sort((firstOperator, secondOperator) =>
    firstOperator.localeCompare(secondOperator, 'bs'),
  )
  const filteredOffers = offers.filter((offer) => {
    const query = offerFilters.query.trim().toLowerCase()
    const operator = offerFilters.operator.trim().toLowerCase()
    const searchableText = [
      offer.company,
      offer.project,
      offer.system,
      offer.operator,
      offer.sentTo,
      offer.checkedBy,
      offer.offerNumber,
      formatOfferNumber(offer.offerNumber),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const offerDate = readDateValue(offer.offerDate)

    return (
      (!query || searchableText.includes(query)) &&
      (!operator || offer.operator?.trim().toLowerCase() === operator) &&
      (!offerFilters.status || (offer.status || 'cekanju') === offerFilters.status) &&
      (!offerFilters.dateFrom || (offerDate && offerDate >= offerFilters.dateFrom)) &&
      (!offerFilters.dateTo || (offerDate && offerDate <= offerFilters.dateTo))
    )
  })
  const activeOffersCount = activeOffers.length
  const totalValueEur = sumOfferAmounts(offers)
  const acceptedValueEur = sumOfferAmounts(acceptedOffers)
  const pendingValueEur = sumOfferAmounts(
    offers.filter((offer) => (offer.status || 'cekanju') === 'cekanju'),
  )
  const activeValueEur = sumOfferAmounts(activeOffers)
  const rejectedValueEur = sumOfferAmounts(
    offers.filter((offer) => offer.status === 'odbijeno'),
  )
  const averageOfferValue = offers.length > 0 ? totalValueEur / offers.length : 0
  const successRate = offers.length > 0 ? (acceptedOffersCount / offers.length) * 100 : 0
  const activeRate = offers.length > 0 ? (activeOffersCount / offers.length) * 100 : 0
  const topCompanies = countByText(offers, 'company').slice(0, 5)
  const topOperators = countByText(offers, 'operator').slice(0, 5)
  const monthlyStats = buildMonthlyStats(offers)
  const monthlyChartStats = [...monthlyStats].reverse()
  const statusValueStats = [
    {
      label: 'Na cekanju',
      count: pendingOffersCount,
      total: pendingValueEur,
      className: 'status-cekanju',
    },
    {
      label: 'Aktivno',
      count: activeOffersCount,
      total: activeValueEur,
      className: 'status-aktivno',
    },
    {
      label: 'Prihvaceno',
      count: acceptedOffersCount,
      total: acceptedValueEur,
      className: 'status-prihvaceno',
    },
    {
      label: 'Odbijeno',
      count: rejectedOffersCount,
      total: rejectedValueEur,
      className: 'status-odbijeno',
    },
  ]
  const maxMonthlyTotal = Math.max(...monthlyChartStats.map((item) => item.total), 0)
  const maxStatusTotal = Math.max(...statusValueStats.map((item) => item.total), 0)
  const maxCompanyTotal = Math.max(...topCompanies.map((item) => item.total), 0)
  const maxOperatorTotal = Math.max(...topOperators.map((item) => item.total), 0)

  return (
    <main className="app-shell">
      <section className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-logo-wrap">
            <img className="sidebar-logo" src={saplastLogo} alt="SAPLAST" />
            <p>AI alat za upravljanje ponudama</p>
          </div>
          <div className="mobile-nav-menu">
            <button
              type="button"
              className="mobile-menu-toggle"
              aria-expanded={isMobileNavOpen}
              aria-label="Otvori meni"
              onClick={() => {
                setIsMobileNavOpen((isOpen) => !isOpen)
                setIsMobileUserOpen(false)
              }}
            >
              <span aria-hidden="true"></span>
              <span aria-hidden="true"></span>
              <span aria-hidden="true"></span>
            </button>
            {isMobileNavOpen && (
              <div className="mobile-menu-panel">
                <button type="button" onClick={() => openView('add')}>
                  <strong>Dodavanje ponude</strong>
                  <span>PDF ekstrakcija</span>
                </button>
                <button type="button" onClick={() => openView('overview')}>
                  <strong>Pregled ponuda</strong>
                  <span>{offers.length} spremljeno</span>
                </button>
                <button type="button" onClick={() => openView('active')}>
                  <strong>Aktivne ponude</strong>
                  <span>{activeOffers.length} aktivno</span>
                </button>
                <button type="button" onClick={() => openView('accepted')}>
                  <strong>Prihvacene ponude</strong>
                  <span>{acceptedOffers.length} prihvaceno</span>
                </button>
                <button type="button" onClick={() => openView('stats')}>
                  <strong>Statistika</strong>
                  <span>Ukupni pregled</span>
                </button>
              </div>
            )}
          </div>
          <div className="mobile-user-menu">
            <button
              type="button"
              className="mobile-user-toggle"
              aria-expanded={isMobileUserOpen}
              aria-label="Otvori profil"
              onClick={() => {
                setIsMobileUserOpen((isOpen) => !isOpen)
                setIsMobileNavOpen(false)
              }}
            >
              {user?.username?.slice(0, 1)}
            </button>
            {isMobileUserOpen && (
              <div className="mobile-user-panel">
                <strong>{user?.username}</strong>
                <button type="button" className="ghost-button" onClick={onLogout}>
                  Odjava
                </button>
              </div>
            )}
          </div>
          <div className="sidebar-main">
            <button
              type="button"
              className={activeView === 'add' ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveView('add')}
            >
              <span className="nav-title-with-icon">
                <span className="nav-emoji-icon" aria-hidden="true">➕</span>
                Dodavanje ponude
              </span>
              <small>PDF ekstrakcija</small>
            </button>
            <button
              type="button"
              className={activeView === 'overview' ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveView('overview')}
            >
              <span className="nav-title-with-icon">
                <span className="nav-emoji-icon" aria-hidden="true">📋</span>
                Pregled ponuda
              </span>
              <small>{offers.length} spremljeno</small>
            </button>
            <button
              type="button"
              className={activeView === 'active' ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveView('active')}
            >
              <span className="nav-title-with-icon">
                <span className="nav-emoji-icon" aria-hidden="true">🟢</span>
                Aktivne ponude
              </span>
              <small>{activeOffers.length} aktivno</small>
            </button>
            <button
              type="button"
              className={activeView === 'accepted' ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveView('accepted')}
            >
              <span className="nav-title-with-icon">
                <span className="nav-emoji-icon" aria-hidden="true">✅</span>
                Prihvaćene ponude
              </span>
              <small>{acceptedOffers.length} prihvaćeno</small>
            </button>
          </div>
          <div className="sidebar-bottom">
            <button
              type="button"
              className={
                activeView === 'stats' ? 'nav-item stats-nav active' : 'nav-item stats-nav'
              }
              onClick={() => setActiveView('stats')}
            >
              <span className="nav-title-with-icon">
                <span className="nav-emoji-icon" aria-hidden="true">📊</span>
                Statistika
              </span>
              <small>Ukupni pregled</small>
            </button>
            <div className="sidebar-user">
              <div className="sidebar-user-info">
                <span className="user-avatar">{user?.username?.slice(0, 1)}</span>
                <span>{user?.username}</span>
              </div>
              <button type="button" className="ghost-button" onClick={onLogout}>
                Odjava
              </button>
            </div>
          </div>
        </aside>

        <div className="content-area">
          {(status || error) && (
            <div className={error ? 'message error' : 'message'}>{error || status}</div>
          )}

          {activeView === 'overview' ? (
            <OffersTable
              offers={filteredOffers}
              selectedOfferId={selectedOffer?._id}
              title="Ponude"
              eyebrow="Arhiva"
              showFilters
              filters={offerFilters}
              operatorOptions={operatorOptions}
              totalOffers={offers.length}
              onClearFilters={clearOfferFilters}
              onFilterChange={handleFilterChange}
              onDelete={handleDelete}
              onOpenPdf={handleOpenPdf}
              onSelect={handleViewOffer}
              onStatusChange={handleStatusChange}
              onTrack={handleTrackOffer}
            />
          ) : activeView === 'active' ? (
            <OffersTable
              offers={activeOffers}
              selectedOfferId={selectedOffer?._id}
              title="Aktivne ponude"
              eyebrow="Aktivno"
              emptyMessage="Nema aktivnih ponuda."
              showTrackAction
              onDelete={handleDelete}
              onOpenPdf={handleOpenPdf}
              onSelect={handleViewOffer}
              onStatusChange={handleStatusChange}
              onTrack={handleTrackOffer}
            />
          ) : activeView === 'accepted' ? (
            <OffersTable
              offers={acceptedOffers}
              selectedOfferId={selectedOffer?._id}
              title="Prihvaćene ponude"
              eyebrow="Prihvaćeno"
              emptyMessage="Nema prihvaćenih ponuda."
              onDelete={handleDelete}
              onOpenPdf={handleOpenPdf}
              onSelect={handleViewOffer}
              onStatusChange={handleStatusChange}
              onTrack={handleTrackOffer}
            />
          ) : activeView === 'details' ? (
            <OfferDetailsView
              activeProjectOffer={activeProjectOffer}
              offer={selectedOffer}
              relatedOffers={relatedProjectOffers}
              onBack={() => setActiveView(detailsBackView || 'overview')}
              onOpenPdf={handleOpenPdf}
              onOpenTrackingPdf={handleOpenTrackingPdfForOffer}
              onSaveComment={handleSaveComment}
              onSaveDetails={handleSaveDetailFields}
              onTrack={handleTrackOffer}
            />
          ) : activeView === 'tracking' ? (
            <OfferTrackingView
              offer={selectedOffer}
              isSaving={isTrackingSaving}
              uploadingPdfField={uploadingPdfField}
              onBack={() => setActiveView('active')}
              onChange={handleTrackingChange}
              onPdfOpen={handleOpenTrackingPdf}
              onPdfUpload={handleTrackingPdfUpload}
            />
          ) : activeView === 'add' ? (
            <section className="workspace">
              <OfferUploadForm isUploading={isUploading} onUpload={handleUpload} />

              <OfferDetailsForm
                offer={selectedOffer}
                isSaving={isSaving}
                onChange={handleFieldChange}
                onSave={handleSave}
              />
            </section>
          ) : (
            <section className="stats-view">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Statistika</p>
                  <h2>Ukupni pregled</h2>
                </div>
              </div>

              <div className="stats-group">
                <div className="stats-grid">
                  <article className="stat-card">
                    <span>Ukupno ponuda</span>
                    <strong>{offers.length}</strong>
                  </article>
                  <article className="stat-card">
                    <span>Ponude na čekanju</span>
                    <strong>{pendingOffersCount}</strong>
                  </article>
                  <article className="stat-card">
                    <span>Ponude odbijene</span>
                    <strong>{rejectedOffersCount}</strong>
                  </article>
                  <article className="stat-card">
                    <span>Ponude prihvaćene</span>
                    <strong>{acceptedOffersCount}</strong>
                  </article>
                  <article className="stat-card">
                    <span>Ukupna vrijednost</span>
                    <strong>{formatCurrency(totalValueEur, 'EUR')}</strong>
                    <small>Prebaceno u EUR</small>
                  </article>
                  <article className="stat-card">
                    <span>Prihvacena vrijednost</span>
                    <strong>{formatCurrency(acceptedValueEur, 'EUR')}</strong>
                    <small>{acceptedOffersCount} prihvaceno</small>
                  </article>
                  <article className="stat-card">
                    <span>Prosjecna ponuda</span>
                    <strong>{formatCurrency(averageOfferValue, 'EUR')}</strong>
                    <small>Po jednoj ponudi</small>
                  </article>
                  <article className="stat-card">
                    <span>Stopa prihvatanja</span>
                    <strong>{formatPercent(successRate)}</strong>
                    <small>{acceptedOffersCount} od {offers.length}</small>
                  </article>
                  <article className="stat-card">
                    <span>Aktivne ponude</span>
                    <strong>{activeOffersCount}</strong>
                    <small>{formatPercent(activeRate)} ukupnih ponuda</small>
                  </article>
                </div>

                <div className="stats-chart-grid">
                  <section className="stats-panel stats-chart-panel">
                    <div className="stats-panel-heading">
                      <h3>Statusi po vrijednosti</h3>
                    </div>
                    <div className="horizontal-chart">
                      {statusValueStats.map((item) => (
                        <article className="horizontal-chart-row" key={item.label}>
                          <div className="chart-row-heading">
                            <span>{item.label}</span>
                            <strong>{formatCurrency(item.total, 'EUR')}</strong>
                          </div>
                          <div className="chart-track">
                            <span
                              className={`chart-fill ${item.className}`}
                              style={{
                                width: `${readPercentValue(item.total, maxStatusTotal)}%`,
                              }}
                            />
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="stats-panel stats-chart-panel">
                    <div className="stats-panel-heading">
                      <h3>Vrijednost po mjesecima</h3>
                    </div>
                    {monthlyChartStats.length === 0 ? (
                      <p className="muted">Nema podataka za prikaz.</p>
                    ) : (
                      <div className="monthly-bar-chart">
                        {monthlyChartStats.map((item) => (
                          <article className="monthly-bar" key={item.sortKey}>
                            <div className="monthly-bar-track">
                              <span
                                style={{
                                  height: `${readPercentValue(item.total, maxMonthlyTotal)}%`,
                                }}
                              />
                            </div>
                            <strong>{item.label}</strong>
                            <small>{item.count}</small>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <div className="stats-chart-grid">
                  <section className="stats-panel stats-chart-panel">
                    <div className="stats-panel-heading">
                      <h3>Top firme - graf</h3>
                    </div>
                    <div className="horizontal-chart">
                      {topCompanies.map((item) => (
                        <article className="horizontal-chart-row" key={item.label}>
                          <div className="chart-row-heading">
                            <span>{item.label}</span>
                            <strong>{formatCurrency(item.total, 'EUR')}</strong>
                          </div>
                          <div className="chart-track">
                            <span
                              className="chart-fill chart-fill-green"
                              style={{
                                width: `${readPercentValue(item.total, maxCompanyTotal)}%`,
                              }}
                            />
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="stats-panel stats-chart-panel">
                    <div className="stats-panel-heading">
                      <h3>Top operateri - graf</h3>
                    </div>
                    <div className="horizontal-chart">
                      {topOperators.map((item) => (
                        <article className="horizontal-chart-row" key={item.label}>
                          <div className="chart-row-heading">
                            <span>{item.label}</span>
                            <strong>{formatCurrency(item.total, 'EUR')}</strong>
                          </div>
                          <div className="chart-track">
                            <span
                              className="chart-fill chart-fill-dark"
                              style={{
                                width: `${readPercentValue(item.total, maxOperatorTotal)}%`,
                              }}
                            />
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="stats-split-grid">
                  <section className="stats-panel">
                    <div className="stats-panel-heading">
                      <h3>Vrijednost po statusu</h3>
                    </div>
                    <div className="stats-list">
                      {statusValueStats.map((item) => (
                        <article className="stats-row" key={item.label}>
                          <div>
                            <span className={`status-chip ${item.className}`}>
                              {item.label}
                            </span>
                            <strong>{item.count} ponuda</strong>
                          </div>
                          <b>{formatCurrency(item.total, 'EUR')}</b>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="stats-panel">
                    <div className="stats-panel-heading">
                      <h3>Zadnjih 6 mjeseci</h3>
                    </div>
                    <div className="stats-list">
                      {monthlyStats.length === 0 ? (
                        <p className="muted">Nema podataka za prikaz.</p>
                      ) : (
                        monthlyStats.map((item) => (
                          <article className="stats-row" key={item.sortKey}>
                            <div>
                              <span>{item.label}</span>
                              <strong>{item.count} ponuda</strong>
                            </div>
                            <b>{formatCurrency(item.total, 'EUR')}</b>
                          </article>
                        ))
                      )}
                    </div>
                  </section>
                </div>

                <div className="stats-split-grid">
                  <section className="stats-panel">
                    <div className="stats-panel-heading">
                      <h3>Top firme</h3>
                    </div>
                    <div className="stats-list">
                      {topCompanies.map((item) => (
                        <article className="stats-row" key={item.label}>
                          <div>
                            <span>{item.label}</span>
                            <strong>{item.count} ponuda</strong>
                          </div>
                          <b>{formatCurrency(item.total, 'EUR')}</b>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="stats-panel">
                    <div className="stats-panel-heading">
                      <h3>Top operateri</h3>
                    </div>
                    <div className="stats-list">
                      {topOperators.map((item) => (
                        <article className="stats-row" key={item.label}>
                          <div>
                            <span>{item.label}</span>
                            <strong>{item.count} ponuda</strong>
                          </div>
                          <b>{formatCurrency(item.total, 'EUR')}</b>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  )
}

export default OffersPage
