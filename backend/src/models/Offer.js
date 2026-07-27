const mongoose = require('mongoose')

const offerSchema = new mongoose.Schema(
  {
    company: { type: String, trim: true, default: '' },
    project: { type: String, trim: true, default: '' },
    system: { type: String, trim: true, default: '' },
    offerNumber: { type: String, trim: true, default: '' },
    offerDate: { type: Date, default: null },
    elementCount: { type: Number, default: null },
    amount: { type: Number, default: null },
    currency: { type: String, trim: true, default: '' },
    operator: { type: String, trim: true, default: '' },
    checkedBy: { type: String, trim: true, default: '' },
    sentTo: { type: String, trim: true, default: '' },
    comment: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['cekanju', 'aktivno', 'odbijeno', 'prihvaceno'],
      default: 'cekanju',
    },
    tracking: {
      offerSent: { type: Boolean, default: true },
      samplePlans: { type: Boolean, default: false },
      sampleRn: { type: Boolean, default: false },
      samplesDone: { type: Boolean, default: false },
      samplesSent: { type: Boolean, default: false },
      offerAccepted: { type: Boolean, default: false },
    },
    trackingDates: {
      offerSent: { type: Date, default: null },
      samplePlans: { type: Date, default: null },
      sampleRn: { type: Date, default: null },
      samplesDone: { type: Date, default: null },
      samplesSent: { type: Date, default: null },
      offerAccepted: { type: Date, default: null },
    },
    trackingPdfs: {
      samplePlans: {
        originalFileName: { type: String, trim: true, default: '' },
        mimeType: { type: String, trim: true, default: '' },
        fileSize: { type: Number, default: null },
        pdfFileName: { type: String, trim: true, default: '' },
      },
      sampleRn: {
        originalFileName: { type: String, trim: true, default: '' },
        mimeType: { type: String, trim: true, default: '' },
        fileSize: { type: Number, default: null },
        pdfFileName: { type: String, trim: true, default: '' },
      },
    },
    replacementInfo: {
      replacedByOfferNumber: { type: String, trim: true, default: '' },
      replacedAt: { type: Date, default: null },
    },
    originalFileName: { type: String, trim: true, required: true },
    mimeType: { type: String, trim: true, required: true },
    fileSize: { type: Number, required: true },
    pdfFileName: { type: String, trim: true, default: '' },
    rawText: { type: String, default: '' },
  },
  { timestamps: true },
)

offerSchema.index({ offerNumber: 1 }, { name: 'offer_number_lookup' })
offerSchema.index({ company: 1, project: 1 })

module.exports = mongoose.model('Offer', offerSchema)
