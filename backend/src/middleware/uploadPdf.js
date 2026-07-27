const multer = require('multer')

const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Dozvoljen je samo PDF format.'))
      return
    }

    cb(null, true)
  },
})

module.exports = uploadPdf
