import { formatDate, formatEur, formatOfferNumber } from '../utils/formatters'

const trackingFields = [
  ['offerSent', 'Ponuda poslana'],
  ['samplePlans', 'Planovi za uzorak'],
  ['sampleRn', 'Radni nalog za uzorak'],
  ['samplesDone', 'Uzorci urađeni'],
  ['samplesSent', 'Uzorci poslani'],
  ['offerAccepted', 'Ponuda prihvaćena'],
]

const defaultTracking = {
  offerSent: true,
  samplePlans: false,
  sampleRn: false,
  samplesDone: false,
  samplesSent: false,
  offerAccepted: false,
}

const defaultTrackingDates = {
  offerSent: null,
  samplePlans: null,
  sampleRn: null,
  samplesDone: null,
  samplesSent: null,
  offerAccepted: null,
}

const requiredTrackingPdfs = {
  samplePlans: 'PDF planova za uzorak',
  sampleRn: 'PDF radnog naloga za uzorak',
}

function hasTrackingPdf(offer, field) {
  return Boolean(offer?.trackingPdfs?.[field]?.pdfFileName)
}

function canToggleTrackingField(offer, tracking, index) {
  if (index === 0) {
    return false
  }

  const field = trackingFields[index][0]
  const previousFieldsDone = trackingFields
    .slice(0, index)
    .every(([previousField]) => Boolean(tracking[previousField]))
  const laterFieldsDone = trackingFields
    .slice(index + 1)
    .some(([nextField]) => Boolean(tracking[nextField]))
  const hasRequiredPdf = !requiredTrackingPdfs[field] || hasTrackingPdf(offer, field)

  return !tracking[field] ? previousFieldsDone && hasRequiredPdf : !laterFieldsDone
}

function OfferTrackingView({
  offer,
  isSaving,
  uploadingPdfField,
  onBack,
  onChange,
  onPdfOpen,
  onPdfUpload,
}) {
  if (!offer) {
    return (
      <section className="tracking-view">
        <button type="button" className="ghost-button" onClick={onBack}>
          Nazad
        </button>
        <div className="empty-state">
          <h2>Nema odabrane aktivne ponude</h2>
          <p>Izaberi ponudu iz kartice Aktivne ponude.</p>
        </div>
      </section>
    )
  }

  const tracking = {
    ...defaultTracking,
    ...(offer.tracking || {}),
  }
  const trackingDates = {
    ...defaultTrackingDates,
    ...(offer.trackingDates || {}),
    offerSent: offer.createdAt || offer.trackingDates?.offerSent,
  }

  return (
    <section className="tracking-view">
      <div className="tracking-header">
        <div>
          <p className="eyebrow">Praćenje ponude</p>
          <h2>{offer.offerNumber ? formatOfferNumber(offer.offerNumber) : offer.originalFileName}</h2>
          <p className="muted">{offer.project || 'Bez naziva projekta'}</p>
        </div>
        <button type="button" className="ghost-button" onClick={onBack}>
          Nazad na aktivne ponude
        </button>
      </div>

      <div className="tracking-details">
        <div>
          <span>Firma</span>
          <strong>{offer.company || 'Nije prepoznata'}</strong>
        </div>
        <div>
          <span>Projekat</span>
          <strong>{offer.project || '-'}</strong>
        </div>
        <div>
          <span>Sistem</span>
          <strong>{offer.system || '-'}</strong>
        </div>
        <div>
          <span>Datum ponude</span>
          <strong>{formatDate(offer.offerDate)}</strong>
        </div>
        <div>
          <span>Broj elemenata</span>
          <strong>{offer.elementCount ?? '-'}</strong>
        </div>
        <div>
          <span>Iznos EUR</span>
          <strong>{formatEur(offer.amount, offer.currency)}</strong>
        </div>
        <div>
          <span>Operater</span>
          <strong>{offer.operator || '-'}</strong>
        </div>
        <div>
          <span>Poslano</span>
          <strong>{offer.sentTo || '-'}</strong>
        </div>
      </div>

      <div className="tracking-checklist">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Koraci</p>
            <h3>Checklist</h3>
          </div>
          {isSaving && <span className="muted">Spremam...</span>}
        </div>

        {trackingFields.map(([field, label], index) => {
          const pdfRequiredLabel = requiredTrackingPdfs[field]
          const pdf = offer.trackingPdfs?.[field]
          const hasPdf = hasTrackingPdf(offer, field)
          const disabled = !canToggleTrackingField(offer, tracking, index)
          const isPdfUploading = uploadingPdfField === field

          return (
            <div
              className={disabled ? 'tracking-row disabled' : 'tracking-row'}
              key={field}
            >
              <label className="tracking-checkbox">
                <input
                  type="checkbox"
                  checked={Boolean(tracking[field])}
                  disabled={disabled}
                  onChange={(event) => onChange(field, event.target.checked)}
                />
                <span className="tracking-checkbox-text">
                  <span>{label}</span>
                  <small>
                    {tracking[field] && trackingDates[field]
                      ? formatDate(trackingDates[field])
                      : 'Bez datuma'}
                  </small>
                </span>
              </label>

              {pdfRequiredLabel && (
                <div className="tracking-pdf-actions">
                  <label className="tracking-pdf-upload">
                    <input
                      type="file"
                      accept="application/pdf"
                      disabled={isPdfUploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) {
                          onPdfUpload(field, file)
                        }
                        event.target.value = ''
                      }}
                    />
                    {hasPdf ? 'Zamijeni PDF' : 'Dodaj PDF'}
                  </label>

                  {hasPdf && (
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={isPdfUploading}
                      onClick={() => onPdfOpen(field)}
                    >
                      Otvori PDF
                    </button>
                  )}

                  <small className={hasPdf ? 'tracking-pdf-name' : 'tracking-pdf-missing'}>
                    {isPdfUploading
                      ? 'Spremam PDF...'
                      : hasPdf
                        ? pdf.originalFileName
                        : `${pdfRequiredLabel} je obavezan prije cekiranja.`}
                  </small>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default OfferTrackingView
