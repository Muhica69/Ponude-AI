import { useEffect, useRef, useState } from 'react'
import { formatDate, formatOfferNumber } from '../utils/formatters'

const statusLabels = {
  cekanju: 'Na cekanju',
  aktivno: 'Aktivno',
  odbijeno: 'Odbijeno',
  prihvaceno: 'Prihvaceno',
}

const fields = [
  { name: 'company', label: 'Firma', locked: true },
  { name: 'project', label: 'Projekat', locked: true },
  { name: 'system', label: 'Sistem', locked: true },
  { name: 'offerNumber', label: 'Br. ponude', locked: true },
  { name: 'offerDate', label: 'Datum ponude', type: 'date', locked: true },
  { name: 'elementCount', label: 'Br. elemenata', type: 'number', locked: true },
  { name: 'amount', label: 'Iznos', type: 'number', step: '0.01', locked: true },
  { name: 'currency', label: 'Valuta', locked: true },
  { name: 'operator', label: 'Operater', locked: true },
  {
    name: 'status',
    label: 'Status',
    locked: true,
  },
  {
    name: 'checkedBy',
    label: 'Provjera',
    type: 'select',
    options: [
      { value: '', label: 'Odaberi osobu' },
      { value: 'Senaid Preljevic', label: 'Senaid Preljevic' },
      { value: 'Senad Preljevic', label: 'Senad Preljevic' },
    ],
  },
  { name: 'sentTo', label: 'Poslano' },
]

const editableExtractedFields = new Set(['company', 'project', 'system'])

function parseSentTo(value) {
  const recipients = String(value || '')
    .split(/[;\n]+/)
    .map((recipient) => recipient.trim())
    .filter(Boolean)

  return recipients.length > 0 ? recipients : ['']
}

function joinSentTo(recipients) {
  return recipients
    .map((recipient) => recipient.trim())
    .filter(Boolean)
    .join('; ')
}

function OfferDetailsForm({ offer, onChange, onSave, isSaving }) {
  const [unlockedFields, setUnlockedFields] = useState({})
  const [sentToRecipients, setSentToRecipients] = useState([''])
  const [isCommentOpen, setIsCommentOpen] = useState(false)
  const previousOfferKeyRef = useRef('')
  const offerKey = offer?._id || `${offer?.originalFileName || ''}:${offer?.pdfBase64?.slice(0, 20) || ''}`

  useEffect(() => {
    if (previousOfferKeyRef.current !== offerKey) {
      setUnlockedFields({})
      setIsCommentOpen(Boolean(offer?.comment))
      previousOfferKeyRef.current = offerKey
    }

    setSentToRecipients(parseSentTo(offer?.sentTo))
  }, [offer?.comment, offer?.sentTo, offerKey])

  if (!offer) {
    return (
      <section className="empty-state">
        <span className="empty-icon">+</span>
        <h2>Nema odabrane ponude</h2>
        <p>Nakon uploada ovdje ce se prikazati polja za provjeru i ispravku.</p>
      </section>
    )
  }

  function unlockField(fieldName) {
    setUnlockedFields((currentFields) => ({
      ...currentFields,
      [fieldName]: true,
    }))
  }

  function updateSentToRecipient(index, value) {
    const nextRecipients = sentToRecipients.map((recipient, recipientIndex) =>
      recipientIndex === index ? value : recipient,
    )

    setSentToRecipients(nextRecipients)
    onChange('sentTo', joinSentTo(nextRecipients))
  }

  function addSentToRecipient(event) {
    event.preventDefault()
    event.stopPropagation()
    setSentToRecipients((currentRecipients) => [...currentRecipients, ''])
  }

  function removeSentToRecipient(event, index) {
    event.preventDefault()
    event.stopPropagation()

    const nextRecipients = sentToRecipients.filter(
      (_recipient, recipientIndex) => recipientIndex !== index,
    )
    const safeRecipients = nextRecipients.length > 0 ? nextRecipients : ['']

    setSentToRecipients(safeRecipients)
    onChange('sentTo', joinSentTo(safeRecipients))
  }

  return (
    <form className="details-panel" onSubmit={onSave}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Provjera podataka</p>
          <h2>{offer.originalFileName}</h2>
          <p className="muted">Provjeri izdvojene podatke prije arhiviranja.</p>
        </div>
        <button type="submit" disabled={isSaving}>
          {isSaving ? 'Spremam...' : offer._id ? 'Spremi izmjene' : 'Spremi ponudu'}
        </button>
      </div>

      <div className="field-grid">
        {fields.map((field) => {
          const canUnlock = editableExtractedFields.has(field.name)
          const isUnlocked = Boolean(unlockedFields[field.name])
          const isLocked = Boolean(field.locked && !isUnlocked)

          if (field.name === 'sentTo') {
            return (
              <label key={field.name}>
                <span className="field-label-row">
                  <span>{field.label}</span>
                  <button
                    type="button"
                    className="add-field-button"
                    aria-label="Dodaj jos jedno poslano polje"
                    title="Dodaj jos jedno poslano polje"
                    onClick={addSentToRecipient}
                  >
                    +
                  </button>
                </span>
                <div className="multi-input-list">
                  {sentToRecipients.map((recipient, index) => (
                    <div className="multi-input-row" key={`sent-to-${index}`}>
                      <input
                        value={recipient}
                        onChange={(event) => updateSentToRecipient(index, event.target.value)}
                      />
                      {sentToRecipients.length > 1 && (
                        <button
                          type="button"
                          className="remove-field-button"
                          aria-label="Ukloni poslano polje"
                          title="Ukloni poslano polje"
                          onClick={(event) => removeSentToRecipient(event, index)}
                        >
                          -
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </label>
            )
          }

          return (
            <label key={field.name}>
              <span className="field-label-row">
                <span>{field.label}</span>
                {canUnlock && isLocked && (
                  <button
                    type="button"
                    className="edit-field-button"
                    aria-label={`Uredi ${field.label}`}
                    title={`Uredi ${field.label}`}
                    onClick={() => unlockField(field.name)}
                  >
                    {'\u270e'}
                  </button>
                )}
              </span>
              {field.type === 'select' ? (
                <select
                  disabled={isLocked}
                  value={offer[field.name] ?? 'cekanju'}
                  onChange={(event) => onChange(field.name, event.target.value)}
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  readOnly={isLocked}
                  className={isLocked ? 'locked-input' : undefined}
                  type={isLocked && field.type === 'date' ? 'text' : field.type || 'text'}
                  step={field.step}
                  value={
                    isLocked && field.name === 'company' && !offer[field.name]
                      ? 'Nije prepoznata'
                      : isLocked && field.name === 'offerNumber'
                        ? formatOfferNumber(offer[field.name])
                      : isLocked && field.type === 'date'
                        ? formatDate(offer[field.name])
                      : isLocked && field.name === 'status'
                        ? statusLabels[offer[field.name]] || statusLabels.cekanju
                      : field.type === 'date' && offer[field.name]
                        ? offer[field.name].slice(0, 10)
                      : offer[field.name] ?? ''
                  }
                  onChange={(event) => onChange(field.name, event.target.value)}
                />
              )}
            </label>
          )
        })}
      </div>

      <div className="comment-field-panel">
        {!isCommentOpen ? (
          <button
            type="button"
            className="comment-toggle-button"
            onClick={() => setIsCommentOpen(true)}
          >
            + Dodaj komentar
          </button>
        ) : (
          <label>
            <span>Komentar</span>
            <textarea
              rows="4"
              value={offer.comment ?? ''}
              placeholder="Upisi komentar za ovu ponudu"
              onChange={(event) => onChange('comment', event.target.value)}
            />
          </label>
        )}
      </div>
    </form>
  )
}

export default OfferDetailsForm
