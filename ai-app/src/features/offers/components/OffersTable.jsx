import { useState } from 'react'
import { formatDate, formatEur, formatOfferNumber } from '../utils/formatters'
import { downloadOffersExcel } from '../utils/exportOffers'
import excelIcon from '../../../assets/images-removebg-preview.png'

const statusLabels = {
  cekanju: 'Na čekanju',
  aktivno: 'Aktivno',
  odbijeno: 'Odbijeno',
  prihvaceno: 'Prihvaćeno',
}

function hasReplacementInfo(offer) {
  return offer.status === 'odbijeno' && offer.replacementInfo?.replacedByOfferNumber
}

function OffersTable({
  offers,
  selectedOfferId,
  title = 'Ponude',
  eyebrow = 'Arhiva',
  emptyMessage = 'Još nema ubačenih ponuda.',
  showTrackAction = false,
  showFilters = false,
  filters,
  operatorOptions = [],
  totalOffers,
  onClearFilters,
  onDelete,
  onFilterChange,
  onOpenPdf,
  onSelect,
  onTrack,
  onStatusChange,
}) {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)

  function handleDelete(event, offer) {
    event.stopPropagation()

    if (window.confirm(`Obrisati ponudu ${offer.offerNumber || offer.originalFileName}?`)) {
      onDelete(offer)
    }
  }

  function handleTrack(event, offer) {
    event.stopPropagation()
    onTrack(offer)
  }

  function handleOpenPdf(event, offer) {
    event.stopPropagation()
    onOpenPdf(offer)
  }

  return (
    <section className="offers-section">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <div className="table-actions">
          {showFilters && (
            <button
              type="button"
              className="mobile-search-toggle"
              aria-expanded={isMobileFiltersOpen}
              aria-label="Otvori pretragu"
              title="Pretraga"
              onClick={() => setIsMobileFiltersOpen((isOpen) => !isOpen)}
            >
              <span aria-hidden="true">&#128269;</span>
            </button>
          )}
          <button
            type="button"
            className="emoji-action-button"
            aria-label="Izvoz u Excel"
            title="Izvoz u Excel"
            disabled={offers.length === 0}
            onClick={() => downloadOffersExcel(offers)}
          >
            <img className="action-icon-image" src={excelIcon} alt="" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className={isMobileFiltersOpen ? 'filters-bar mobile-open' : 'filters-bar'}>
          <label>
            <span>Pretraga</span>
            <input
              type="search"
              value={filters.query}
              placeholder="Firma, projekat, broj..."
              onChange={(event) => onFilterChange('query', event.target.value)}
            />
          </label>
          <label>
            <span>Operater</span>
            <select
              value={filters.operator}
              onChange={(event) => onFilterChange('operator', event.target.value)}
            >
              <option value="">Svi operateri</option>
              {operatorOptions.map((operator) => (
                <option value={operator} key={operator}>
                  {operator}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select
              value={filters.status}
              onChange={(event) => onFilterChange('status', event.target.value)}
            >
              <option value="">Svi statusi</option>
              <option value="cekanju">{statusLabels.cekanju}</option>
              <option value="aktivno">{statusLabels.aktivno}</option>
              <option value="odbijeno">{statusLabels.odbijeno}</option>
              <option value="prihvaceno">{statusLabels.prihvaceno}</option>
            </select>
          </label>
          <label>
            <span>Datum od</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => onFilterChange('dateFrom', event.target.value)}
            />
          </label>
          <label>
            <span>Datum do</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => onFilterChange('dateTo', event.target.value)}
            />
          </label>
          <button type="button" className="ghost-button" onClick={onClearFilters}>
            Očisti
          </button>
          <span className="filters-count">
            {offers.length}/{totalOffers} prikazano
          </span>
        </div>
      )}

      {offers.length === 0 ? (
        <p className="muted">{emptyMessage}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Firma</th>
                <th>Projekat</th>
                <th>Sistem</th>
                <th>Br. ponude</th>
                <th>Datum ponude</th>
                <th>Elemenata</th>
                <th>Iznos EUR</th>
                <th>Operater</th>
                <th>Status</th>
                <th>Provjera</th>
                <th>Poslano</th>
                <th>Datum spremanja</th>
                {showTrackAction && <th>Praćenje</th>}
                <th>PDF</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => (
                <tr
                  key={offer._id}
                  className={selectedOfferId === offer._id ? 'selected' : ''}
                  onClick={() => onSelect?.(offer)}
                >
                  <td>{offer.company || '-'}</td>
                  <td>{offer.project || '-'}</td>
                  <td>{offer.system || '-'}</td>
                  <td><span className="offer-chip">{formatOfferNumber(offer.offerNumber)}</span></td>
                  <td>{formatDate(offer.offerDate)}</td>
                  <td>{offer.elementCount ?? '-'}</td>
                  <td className="amount-cell">{formatEur(offer.amount, offer.currency)}</td>
                  <td>{offer.operator || '-'}</td>
                  <td>
                    <select
                      className={`status-select status-${offer.status || 'cekanju'}`}
                      value={offer.status || 'cekanju'}
                      disabled={offer.status === 'prihvaceno'}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => onStatusChange(offer, event.target.value)}
                    >
                      <option value="cekanju">{statusLabels.cekanju}</option>
                      <option value="aktivno">{statusLabels.aktivno}</option>
                      <option value="odbijeno">{statusLabels.odbijeno}</option>
                      <option value="prihvaceno">{statusLabels.prihvaceno}</option>
                    </select>
                    {hasReplacementInfo(offer) && (
                      <span className="replacement-note">
                        Nova ponuda napravljena: {formatOfferNumber(offer.replacementInfo.replacedByOfferNumber)}
                      </span>
                    )}
                  </td>
                  <td>{offer.checkedBy || '-'}</td>
                  <td>{offer.sentTo || '-'}</td>
                  <td>{formatDate(offer.createdAt)}</td>
                  {showTrackAction && (
                    <td>
                      <button
                        type="button"
                        className="emoji-action-button"
                        aria-label="Prati ponudu"
                        title="Prati ponudu"
                        onClick={(event) => handleTrack(event, offer)}
                      >
                        👀
                      </button>
                    </td>
                  )}
                  <td>
                    <button
                      type="button"
                      className="emoji-action-button"
                      aria-label="Otvori PDF"
                      title="Otvori PDF"
                      disabled={!offer.pdfFileName}
                      onClick={(event) => handleOpenPdf(event, offer)}
                    >
                      📄
                    </button>
                  </td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="emoji-action-button"
                      aria-label="Obriši ponudu"
                      title="Obriši ponudu"
                      onClick={(event) => handleDelete(event, offer)}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default OffersTable
