const express = require('express')
const {
  createOffer,
  deleteOffer,
  listOffers,
  openOfferPdf,
  openTrackingPdf,
  uploadOffer,
  uploadTrackingPdf,
  updateOffer,
} = require('../controllers/offer.controller')
const requireAuth = require('../middleware/auth')
const uploadPdf = require('../middleware/uploadPdf')

const router = express.Router()

router.use(requireAuth)

router.get('/', listOffers)
router.post('/', createOffer)
router.post('/upload', uploadPdf.single('offerPdf'), uploadOffer)
router.get('/:id/pdf', openOfferPdf)
router.post('/:id/tracking-pdfs/:field', uploadPdf.single('trackingPdf'), uploadTrackingPdf)
router.get('/:id/tracking-pdfs/:field', openTrackingPdf)
router.patch('/:id', updateOffer)
router.delete('/:id', deleteOffer)

module.exports = router
