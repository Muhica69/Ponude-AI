const fs = require('fs/promises')
const path = require('path')
const Offer = require('../models/Offer')
const { extractOfferFields } = require('../services/offerExtractor.service')

const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'offers')

const trackingPdfFields = {
  samplePlans: 'Planovi za uzorak',
  sampleRn: 'Radni nalog za uzorak',
}

const editableFields = [
  'company',
  'project',
  'system',
  'operator',
  'checkedBy',
  'sentTo',
  'comment',
  'status',
  'tracking',
  'trackingDates',
]

const requiredFields = [
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

const creatableFields = [
  'company',
  'project',
  'system',
  'offerNumber',
  'offerDate',
  'elementCount',
  'amount',
  'currency',
  'operator',
  'checkedBy',
  'sentTo',
  'comment',
  'originalFileName',
  'mimeType',
  'fileSize',
  'pdfBase64',
]

function buildStoredPdfName(originalFileName = 'ponuda.pdf') {
  const extension = path.extname(originalFileName).toLowerCase() || '.pdf'
  const safeBaseName = path
    .basename(originalFileName, extension)
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'ponuda'

  return `${Date.now()}-${safeBaseName}${extension}`
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildExactTextRegex(value) {
  return new RegExp(`^${escapeRegExp(String(value).trim())}$`, 'i')
}

function normalizeComparableText(value) {
  return String(value || '').trim().toLowerCase()
}

function isSameProject(firstProject, secondProject) {
  return normalizeComparableText(firstProject) === normalizeComparableText(secondProject)
}

function findOfferWithDifferentProject(offers, project) {
  return offers.find((offer) => !isSameProject(offer.project, project))
}

function assertTrackingPdfField(field) {
  if (!Object.prototype.hasOwnProperty.call(trackingPdfFields, field)) {
    const error = new Error('Nepoznat PDF prilog.')
    error.statusCode = 400
    throw error
  }
}

async function savePdfFromPayload(payload) {
  if (!payload.pdfBase64) {
    return ''
  }

  const buffer = Buffer.from(payload.pdfBase64, 'base64')

  if (!buffer.length) {
    return ''
  }

  await fs.mkdir(uploadsDir, { recursive: true })

  const pdfFileName = buildStoredPdfName(payload.originalFileName)
  await fs.writeFile(path.join(uploadsDir, pdfFileName), buffer)

  return pdfFileName
}

async function deleteStoredPdf(pdfFileName) {
  if (!pdfFileName) {
    return
  }

  try {
    await fs.unlink(path.join(uploadsDir, pdfFileName))
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error
    }
  }
}

async function saveUploadedPdf(file) {
  await fs.mkdir(uploadsDir, { recursive: true })

  const pdfFileName = buildStoredPdfName(file.originalname)
  await fs.writeFile(path.join(uploadsDir, pdfFileName), file.buffer)

  return {
    originalFileName: file.originalname,
    mimeType: file.mimetype,
    fileSize: file.size,
    pdfFileName,
  }
}

function normalizeOfferPayload(body) {
  return editableFields.reduce((payload, field) => {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
      return payload
    }

    if (field === 'elementCount' || field === 'amount') {
      payload[field] = body[field] === '' ? null : Number(body[field])
      return payload
    }

    if (field === 'offerDate') {
      payload[field] = body[field] ? new Date(body[field]) : null
      return payload
    }

    if (field === 'tracking') {
      payload[field] = body[field] || {}
      return payload
    }

    if (field === 'trackingDates') {
      payload[field] = Object.entries(body[field] || {}).reduce(
        (dates, [trackingField, value]) => ({
          ...dates,
          [trackingField]: value ? new Date(value) : null,
        }),
        {},
      )
      return payload
    }

    payload[field] = body[field]
    return payload
  }, {})
}

function normalizeCreatePayload(body) {
  return creatableFields.reduce((payload, field) => {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
      return payload
    }

    if (field === 'elementCount' || field === 'amount' || field === 'fileSize') {
      payload[field] = body[field] === '' ? null : Number(body[field])
      return payload
    }

    if (field === 'pdfBase64') {
      return payload
    }

    if (field === 'offerDate') {
      payload[field] = body[field] ? new Date(body[field]) : null
      return payload
    }

    payload[field] = body[field]
    return payload
  }, {})
}

function findMissingFields(payload, fields = requiredFields) {
  return fields
    .filter(([field]) => {
      const value = payload[field]
      return value === null || value === undefined || value === ''
    })
    .map(([, label]) => label)
}

async function listKnownCompaniesFromOffers() {
  const companies = await Offer.distinct('company', {
    company: { $type: 'string', $ne: '' },
  })

  return companies
    .map((company) => String(company).trim())
    .filter(Boolean)
}

async function listOffers(_req, res, next) {
  try {
    const offers = await Offer.find()
      .sort({ createdAt: -1 })
      .select('-rawText')

    res.json(offers)
  } catch (error) {
    next(error)
  }
}

async function uploadOffer(req, res, next) {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'PDF ponuda je obavezna.' })
      return
    }

    const { extractTextFromPdf } = require('../services/pdfText.service')
    const rawText = await extractTextFromPdf(req.file.buffer)
    const extracted = extractOfferFields(rawText, {
      knownCompanies: await listKnownCompaniesFromOffers(),
    })

    if (extracted.offerNumber && extracted.project) {
      const existingOffers = await Offer.find({
        offerNumber: extracted.offerNumber,
      }).select('offerNumber project originalFileName createdAt')
      const existingOffer = findOfferWithDifferentProject(
        existingOffers,
        extracted.project,
      )

      if (existingOffer) {
        res.status(409).json({
          message: `Ponuda ${extracted.offerNumber} je već dodana i ne može se ponovo spremiti.`,
          existingOffer,
        })
        return
      }
    }

    const { rawText: _rawText, ...preview } = extracted

    res.json({
      ...preview,
      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      pdfBase64: req.file.buffer.toString('base64'),
    })
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({
        message: 'Ponuda sa istim brojem već postoji i ne može se ponovo spremiti.',
      })
      return
    }

    next(error)
  }
}

async function createOffer(req, res, next) {
  try {
    const payload = normalizeCreatePayload(req.body)
    const missingFields = findMissingFields(payload)

    if (missingFields.length > 0) {
      res.status(400).json({
        message: `Popuni sva polja prije spremanja: ${missingFields.join(', ')}.`,
        missingFields,
      })
      return
    }

    const existingOffers = await Offer.find({
      offerNumber: payload.offerNumber,
    }).select('offerNumber project originalFileName createdAt')
    const existingOffer = findOfferWithDifferentProject(
      existingOffers,
      payload.project,
    )

    if (existingOffer) {
      res.status(409).json({
        message: `Ponuda ${payload.offerNumber} je već dodana i ne može se ponovo spremiti.`,
        existingOffer,
      })
      return
    }

    payload.pdfFileName = await savePdfFromPayload(req.body)
    payload.status = 'cekanju'
    const offer = await Offer.create(payload)

    if (payload.project && payload.offerNumber) {
      await Offer.updateMany(
        {
          _id: { $ne: offer._id },
          offerNumber: { $ne: payload.offerNumber },
          project: buildExactTextRegex(payload.project),
          status: { $ne: 'prihvaceno' },
        },
        {
          $set: {
            status: 'odbijeno',
            replacementInfo: {
              replacedByOfferNumber: payload.offerNumber,
              replacedAt: new Date(),
            },
          },
        },
      )
    }

    const savedOffer = await Offer.findById(offer._id).select('-rawText')

    res.status(201).json(savedOffer)
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({
        message: 'Ponuda sa istim brojem već postoji i ne može se ponovo spremiti.',
      })
      return
    }

    next(error)
  }
}

async function updateOffer(req, res, next) {
  try {
    const updates = normalizeOfferPayload(req.body)
    const missingFields = findMissingFields(
      { ...req.body, ...updates },
      [
        ['checkedBy', 'Provjera'],
        ['sentTo', 'Poslano'],
        ['status', 'Status'],
      ],
    )

    if (missingFields.length > 0) {
      res.status(400).json({
        message: `Popuni sva ručna polja prije spremanja: ${missingFields.join(', ')}.`,
        missingFields,
      })
      return
    }

    const currentOffer = await Offer.findById(req.params.id).select('status trackingPdfs')

    if (!currentOffer) {
      res.status(404).json({ message: 'Ponuda nije pronađena.' })
      return
    }

    if (
      currentOffer.status === 'prihvaceno' &&
      updates.status &&
      updates.status !== 'prihvaceno'
    ) {
      res.status(400).json({
        message: 'Status prihvaćene ponude više nije moguće mijenjati.',
      })
      return
    }

    if (updates.tracking) {
      const missingPdfLabels = Object.entries(trackingPdfFields)
        .filter(([field]) => {
          const isChecked = Boolean(updates.tracking[field])
          const hasPdf = Boolean(currentOffer.trackingPdfs?.[field]?.pdfFileName)
          return isChecked && !hasPdf
        })
        .map(([, label]) => label)

      if (missingPdfLabels.length > 0) {
        res.status(400).json({
          message: `Dodaj PDF prije cekiranja: ${missingPdfLabels.join(', ')}.`,
        })
        return
      }
    }

    if (updates.offerNumber) {
      const existingOffer = await Offer.findOne({
        _id: { $ne: req.params.id },
        offerNumber: updates.offerNumber,
      }).select('offerNumber originalFileName createdAt')

      if (existingOffer) {
        res.status(409).json({
          message: `Ponuda ${updates.offerNumber} je već dodana i ne može se ponovo spremiti.`,
          existingOffer,
        })
        return
      }
    }

    const offer = await Offer.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select('-rawText')

    if (!offer) {
      res.status(404).json({ message: 'Ponuda nije pronađena.' })
      return
    }

    res.json(offer)
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({
        message: 'Ponuda sa istim brojem već postoji i ne može se ponovo spremiti.',
      })
      return
    }

    next(error)
  }
}

async function openOfferPdf(req, res, next) {
  try {
    const offer = await Offer.findById(req.params.id).select('originalFileName pdfFileName')

    if (!offer) {
      res.status(404).json({ message: 'Ponuda nije pronađena.' })
      return
    }

    if (!offer.pdfFileName) {
      res.status(404).json({ message: 'PDF za ovu ponudu nije sačuvan.' })
      return
    }

    const pdfPath = path.join(uploadsDir, offer.pdfFileName)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(offer.originalFileName)}"`,
    )
    res.sendFile(pdfPath, (error) => {
      if (error && !res.headersSent) {
        next(error)
      }
    })
  } catch (error) {
    next(error)
  }
}

async function uploadTrackingPdf(req, res, next) {
  try {
    assertTrackingPdfField(req.params.field)

    if (!req.file) {
      res.status(400).json({ message: 'PDF prilog je obavezan.' })
      return
    }

    const offer = await Offer.findById(req.params.id).select('trackingPdfs')

    if (!offer) {
      res.status(404).json({ message: 'Ponuda nije pronadjena.' })
      return
    }

    const field = req.params.field
    const previousPdfFileName = offer.trackingPdfs?.[field]?.pdfFileName
    const pdfPayload = await saveUploadedPdf(req.file)

    offer.set(`trackingPdfs.${field}`, pdfPayload)
    await offer.save()
    await deleteStoredPdf(previousPdfFileName)

    const updatedOffer = await Offer.findById(offer._id).select('-rawText')
    res.status(201).json(updatedOffer)
  } catch (error) {
    next(error)
  }
}

async function openTrackingPdf(req, res, next) {
  try {
    assertTrackingPdfField(req.params.field)

    const offer = await Offer.findById(req.params.id).select('trackingPdfs')

    if (!offer) {
      res.status(404).json({ message: 'Ponuda nije pronadjena.' })
      return
    }

    const pdf = offer.trackingPdfs?.[req.params.field]

    if (!pdf?.pdfFileName) {
      res.status(404).json({ message: 'PDF prilog nije sacuvan.' })
      return
    }

    const pdfPath = path.join(uploadsDir, pdf.pdfFileName)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(pdf.originalFileName)}"`,
    )
    res.sendFile(pdfPath, (error) => {
      if (error && !res.headersSent) {
        next(error)
      }
    })
  } catch (error) {
    next(error)
  }
}

async function deleteOffer(req, res, next) {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id)

    if (!offer) {
      res.status(404).json({ message: 'Ponuda nije pronađena.' })
      return
    }

    await deleteStoredPdf(offer.pdfFileName)
    await Promise.all(
      Object.keys(trackingPdfFields).map((field) =>
        deleteStoredPdf(offer.trackingPdfs?.[field]?.pdfFileName),
      ),
    )
    res.status(204).send()
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createOffer,
  listOffers,
  openOfferPdf,
  openTrackingPdf,
  uploadOffer,
  uploadTrackingPdf,
  updateOffer,
  deleteOffer,
}
