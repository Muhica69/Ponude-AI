import { convertToEur, formatCurrency, formatDate, formatOfferNumber } from './formatters'

const columns = [
  ['Firma', 'company'],
  ['Projekat', 'project'],
  ['Sistem', 'system'],
  ['Broj ponude', 'offerNumber'],
  ['Datum ponude', 'offerDate'],
  ['Broj elemenata', 'elementCount'],
  ['Originalni iznos', 'originalAmount'],
  ['Iznos EUR', 'amountEur'],
  ['Operater', 'operator'],
  ['Status', 'status'],
  ['Provjera', 'checkedBy'],
  ['Poslano', 'sentTo'],
  ['Datum spremanja', 'createdAt'],
]

const statusLabels = {
  cekanju: 'Na čekanju',
  aktivno: 'Aktivno',
  odbijeno: 'Odbijeno',
  prihvaceno: 'Prihvaćeno',
}

function escapeHtml(value) {
  const stringValue = value === null || value === undefined ? '' : String(value)

  return stringValue
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDateForExport(value) {
  return value ? formatDate(value) : ''
}

function readExportValue(offer, key) {
  if (key === 'amountEur') {
    return formatCurrency(convertToEur(offer.amount, offer.currency) || 0, 'EUR')
  }

  if (key === 'originalAmount') {
    return formatCurrency(offer.amount, offer.currency || 'BAM')
  }

  if (key === 'createdAt' || key === 'offerDate') {
    return formatDateForExport(offer[key])
  }

  if (key === 'status') {
    return statusLabels[offer.status] || statusLabels.cekanju
  }

  if (key === 'offerNumber') {
    return formatOfferNumber(offer.offerNumber)
  }

  return offer[key] ?? ''
}

function buildStyledWorkbook(offers) {
  const exportedAt = formatDate(new Date())
  const totalEur = offers.reduce(
    (sum, offer) => sum + (convertToEur(offer.amount, offer.currency) || 0),
    0,
  )

  const headerCells = columns
    .map(([label]) => `<th>${escapeHtml(label)}</th>`)
    .join('')

  const bodyRows = offers
    .map(
      (offer, index) => `
        <tr class="${index % 2 === 0 ? 'even' : 'odd'}">
          ${columns
            .map(([, key]) => `<td>${escapeHtml(readExportValue(offer, key))}</td>`)
            .join('')}
        </tr>
      `,
    )
    .join('')

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Ponude</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                    <x:FreezePanes/>
                    <x:FrozenNoSplit/>
                    <x:SplitHorizontal>4</x:SplitHorizontal>
                    <x:TopRowBottomPane>4</x:TopRowBottomPane>
                    <x:ActivePane>2</x:ActivePane>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
        <![endif]-->
        <style>
          body {
            font-family: "Segoe UI", Arial, sans-serif;
            color: #142017;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          .title {
            background: #102015;
            color: #52c90f;
            font-size: 24px;
            font-weight: 800;
            height: 42px;
          }
          .subtitle {
            background: #e5f8dc;
            color: #2f7f0f;
            font-size: 13px;
            height: 28px;
          }
          .summary-label {
            background: #f3f7f0;
            color: #647067;
            font-weight: 700;
          }
          .summary-value {
            background: #f3f7f0;
            color: #142017;
            font-weight: 800;
          }
          th {
            background: #52c90f;
            border: 1px solid #2f7f0f;
            color: #ffffff;
            font-size: 12px;
            font-weight: 800;
            height: 30px;
            text-align: left;
          }
          td {
            border: 1px solid #d9e5d3;
            font-size: 12px;
            height: 26px;
            mso-number-format: "\\@";
          }
          .even td {
            background: #ffffff;
          }
          .odd td {
            background: #f8fcf6;
          }
        </style>
      </head>
      <body>
        <table>
          <colgroup>
            <col style="width: 180px" />
            <col style="width: 180px" />
            <col style="width: 260px" />
            <col style="width: 150px" />
            <col style="width: 110px" />
            <col style="width: 150px" />
            <col style="width: 150px" />
            <col style="width: 160px" />
            <col style="width: 160px" />
            <col style="width: 160px" />
            <col style="width: 130px" />
            <col style="width: 160px" />
            <col style="width: 220px" />
          </colgroup>
          <tr>
            <td class="title" colspan="${columns.length}">SAPLAST - Pregled ponuda</td>
          </tr>
          <tr>
            <td class="subtitle" colspan="${columns.length}">Izvoz kreiran: ${escapeHtml(exportedAt)}</td>
          </tr>
          <tr>
            <td class="summary-label">Ukupno ponuda</td>
            <td class="summary-value">${offers.length}</td>
            <td class="summary-label">Vrijednost u EUR</td>
            <td class="summary-value">${escapeHtml(formatCurrency(totalEur, 'EUR'))}</td>
            <td colspan="${columns.length - 4}"></td>
          </tr>
          <tr>${headerCells}</tr>
          ${bodyRows}
        </table>
      </body>
    </html>
  `
}

function downloadOffersExcel(offers) {
  const workbook = buildStyledWorkbook(offers)
  const blob = new Blob([workbook], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)

  link.href = url
  link.download = `ponude-${date}.xls`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export { downloadOffersExcel }
