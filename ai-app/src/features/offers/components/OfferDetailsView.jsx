import { useEffect, useState } from 'react'
import { formatDate, formatEur, formatOfferNumber } from '../utils/formatters'

const statusLabels = {
  cekanju: 'Na cekanju',
  aktivno: 'Aktivno',
  odbijeno: 'Odbijeno',
  prihvaceno: 'Prihvaceno',
}

const trackingFields = [
  ['offerSent', 'Ponuda poslana'],
  ['samplePlans', 'Planovi za uzorak'],
  ['sampleRn', 'Radni nalog za uzorak'],
  ['samplesDone', 'Uzorci uradeni'],
  ['samplesSent', 'Uzorci poslani'],
  ['offerAccepted', 'Ponuda prihvacena'],
]

const trackingPdfLabels = {
  samplePlans: 'PDF planova',
  sampleRn: 'PDF radnog naloga',
}

const detailFields = [
  ['company', 'Firma'],
  ['project', 'Projekat'],
  ['system', 'Sistem'],
  ['offerNumber', 'Broj ponude', formatOfferNumber],
  ['offerDate', 'Datum ponude', formatDate],
  ['elementCount', 'Broj elemenata'],
  ['amount', 'Iznos EUR', (value, offer) => formatEur(value, offer.currency)],
  ['operator', 'Operater'],
  ['checkedBy', 'Provjera'],
  ['sentTo', 'Poslano'],
  ['createdAt', 'Datum spremanja', formatDate],
]

const editableDetailFields = new Set(['company', 'project', 'system', 'sentTo', 'operator'])

function readStatusLabel(status) {
  return statusLabels[status || 'cekanju'] || status || '-'
}

function readFieldValue(offer, [field, _label, formatter]) {
  const value = offer?.[field]

  if (formatter) {
    return formatter(value, offer)
  }

  return value === null || value === undefined || value === '' ? '-' : value
}

function readTrackingDate(offer, field) {
  if (field === 'offerSent') {
    return offer.createdAt || offer.trackingDates?.offerSent
  }

  return offer.trackingDates?.[field]
}

function getCurrentPhase(offer) {
  const tracking = {
    offerSent: true,
    ...(offer?.tracking || {}),
  }
  const lastDoneIndex = trackingFields.reduce(
    (doneIndex, [field], index) => (tracking[field] ? index : doneIndex),
    0,
  )

  return trackingFields[lastDoneIndex]?.[1] || 'Ponuda poslana'
}

function OfferDetailsView({
  activeProjectOffer,
  offer,
  relatedOffers,
  onBack,
  onOpenPdf,
  onOpenTrackingPdf,
  onSaveComment,
  onSaveDetails,
  onTrack,
}) {
  const [isCommentEditorOpen, setIsCommentEditorOpen] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [editingFields, setEditingFields] = useState({})
  const [detailDraft, setDetailDraft] = useState({})
  const [isSavingDetails, setIsSavingDetails] = useState(false)

  useEffect(() => {
    setIsCommentEditorOpen(false)
    setCommentDraft(offer?.comment || '')
    setEditingFields({})
    setDetailDraft({
      company: offer?.company || '',
      project: offer?.project || '',
      system: offer?.system || '',
      sentTo: offer?.sentTo || '',
      operator: offer?.operator || '',
    })
  }, [
    offer?._id,
    offer?.comment,
    offer?.company,
    offer?.project,
    offer?.system,
    offer?.sentTo,
    offer?.operator,
  ])

  const isEditingDetails = Object.values(editingFields).some(Boolean)

  function startEditingField(field) {
    setEditingFields((currentFields) => ({
      ...currentFields,
      [field]: true,
    }))
  }

  function changeDetailDraft(field, value) {
    setDetailDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }))
  }

  function cancelDetailEdit() {
    setEditingFields({})
    setDetailDraft({
      company: offer?.company || '',
      project: offer?.project || '',
      system: offer?.system || '',
      sentTo: offer?.sentTo || '',
      operator: offer?.operator || '',
    })
  }

  async function saveDetailEdit() {
    setIsSavingDetails(true)

    try {
      const isSaved = await onSaveDetails(offer, detailDraft)

      if (isSaved) {
        setEditingFields({})
      }
    } finally {
      setIsSavingDetails(false)
    }
  }

  if (!offer) {
    return (
      <section className="offer-details-view">
        <button type="button" className="ghost-button" onClick={onBack}>
          Nazad
        </button>
        <div className="empty-state">
          <h2>Nema odabrane ponude</h2>
          <p>Izaberi ponudu iz pregleda.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="offer-details-view">
      <div className="details-hero">
        <div>
          <p className="eyebrow">Detalji ponude</p>
          <h2>{formatOfferNumber(offer.offerNumber)}</h2>
          <p>{offer.project || 'Bez naziva projekta'}</p>
        </div>
        <div className="details-actions">
          <button type="button" className="ghost-button" onClick={onBack}>
            Nazad
          </button>
          <button
            type="button"
            className="ghost-button"
            disabled={!offer.pdfFileName}
            onClick={() => onOpenPdf(offer)}
          >
            Otvori PDF ponude
          </button>
          {offer.status === 'aktivno' && (
            <button type="button" onClick={() => onTrack(offer)}>
              Pracenje
            </button>
          )}
        </div>
      </div>

      <div className="details-grid">
        <section className="details-panel full-details-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Ponuda</p>
              <h3>Osnovni podaci</h3>
            </div>
            <span className={`status-chip status-${offer.status || 'cekanju'}`}>
              {readStatusLabel(offer.status)}
            </span>
          </div>
          <div className="details-data-grid">
            {detailFields.map((fieldConfig) => {
              const [field, label] = fieldConfig
              const canEditField = editableDetailFields.has(field)
              const isEditingField = Boolean(editingFields[field])

              return (
                <div key={field}>
                  <span className="detail-field-label-row">
                    <span>{label}</span>
                    {canEditField && !isEditingField && (
                      <button
                        type="button"
                        className="edit-field-button"
                        aria-label={`Uredi ${label}`}
                        title={`Uredi ${label}`}
                        onClick={() => startEditingField(field)}
                      >
                        {'\u270e'}
                      </button>
                    )}
                  </span>
                  {isEditingField ? (
                    <input
                      className="detail-edit-input"
                      value={detailDraft[field] ?? ''}
                      onChange={(event) => changeDetailDraft(field, event.target.value)}
                    />
                  ) : (
                    <strong>{readFieldValue(offer, fieldConfig)}</strong>
                  )}
                </div>
              )
            })}
          </div>
          {isEditingDetails && (
            <div className="detail-edit-actions">
              <button
                type="button"
                disabled={isSavingDetails}
                onClick={saveDetailEdit}
              >
                {isSavingDetails ? 'Cuvanje...' : 'Sacuvaj'}
              </button>
              <button
                type="button"
                className="ghost-button"
                disabled={isSavingDetails}
                onClick={cancelDetailEdit}
              >
                Odustani
              </button>
            </div>
          )}
          {offer.replacementInfo?.replacedByOfferNumber && (
            <p className="replacement-note detail-replacement-note">
              Nova ponuda napravljena: {formatOfferNumber(offer.replacementInfo.replacedByOfferNumber)}
              {offer.replacementInfo.replacedAt
                ? ` (${formatDate(offer.replacementInfo.replacedAt)})`
                : ''}
            </p>
          )}
          {offer.comment && (
            <div className="detail-comment-box">
              <div className="detail-comment-heading">
                <span>Komentar</span>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setIsCommentEditorOpen(true)}
                >
                  Uredi komentar
                </button>
              </div>
              <p>{offer.comment}</p>
            </div>
          )}
          {!offer.comment && !isCommentEditorOpen && (
            <div className="detail-comment-box">
              <button
                type="button"
                className="comment-toggle-button"
                onClick={() => setIsCommentEditorOpen(true)}
              >
                + Dodaj komentar
              </button>
            </div>
          )}
          {isCommentEditorOpen && (
            <form
              className="detail-comment-editor"
              onSubmit={async (event) => {
                event.preventDefault()
                const isSaved = await onSaveComment(offer, commentDraft)
                if (isSaved) {
                  setIsCommentEditorOpen(false)
                }
              }}
            >
              <label>
                <span>Komentar</span>
                <textarea
                  rows="4"
                  value={commentDraft}
                  placeholder="Upisi komentar za ovu ponudu"
                  onChange={(event) => setCommentDraft(event.target.value)}
                />
              </label>
              <div className="detail-comment-actions">
                <button type="submit">Spremi komentar</button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    setCommentDraft(offer.comment || '')
                    setIsCommentEditorOpen(false)
                  }}
                >
                  Odustani
                </button>
              </div>
            </form>
          )}
        </section>

        {activeProjectOffer && (
          <section className="details-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Projekat</p>
                <h3>Pracenje projekta</h3>
              </div>
            </div>
            <>
              <div className="active-phase-card">
                <span>Aktivna ponuda</span>
                <strong>{formatOfferNumber(activeProjectOffer.offerNumber)}</strong>
                <small>{getCurrentPhase(activeProjectOffer)}</small>
              </div>
              <div className="phase-list">
                {trackingFields.map(([field, label]) => {
                  const isDone = Boolean({
                    offerSent: true,
                    ...(activeProjectOffer.tracking || {}),
                  }[field])
                  const pdf = activeProjectOffer.trackingPdfs?.[field]

                  return (
                    <div className={isDone ? 'phase-row done' : 'phase-row'} key={field}>
                      <div>
                        <strong>{label}</strong>
                        <span>{isDone ? formatDate(readTrackingDate(activeProjectOffer, field)) : 'Nije zavrseno'}</span>
                      </div>
                      {trackingPdfLabels[field] && pdf?.pdfFileName && (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => onOpenTrackingPdf(activeProjectOffer, field)}
                        >
                          {trackingPdfLabels[field]}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          </section>
        )}

        <section className="details-panel full-details-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Historija projekta</p>
              <h3>Ponude za isti projekat</h3>
            </div>
          </div>
          {relatedOffers.length === 0 ? (
            <p className="muted">Nema drugih ponuda za ovaj projekat.</p>
          ) : (
            <div className="related-offers-list">
              {relatedOffers.map((relatedOffer) => (
                <article className="related-offer" key={relatedOffer._id}>
                  <div>
                    <span className={`status-chip status-${relatedOffer.status || 'cekanju'}`}>
                      {readStatusLabel(relatedOffer.status)}
                    </span>
                    <h4>{formatOfferNumber(relatedOffer.offerNumber)}</h4>
                    <p>
                      {formatDate(relatedOffer.offerDate)} / {formatDate(relatedOffer.createdAt)} / {formatEur(relatedOffer.amount, relatedOffer.currency)}
                    </p>
                    {relatedOffer.replacementInfo?.replacedByOfferNumber && (
                      <span className="replacement-note">
                        Nova ponuda napravljena: {formatOfferNumber(relatedOffer.replacementInfo.replacedByOfferNumber)}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={!relatedOffer.pdfFileName}
                    onClick={() => onOpenPdf(relatedOffer)}
                  >
                    PDF
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

export default OfferDetailsView
