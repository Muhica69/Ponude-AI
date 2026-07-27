const { PDFParse } = require('pdf-parse')

async function extractTextFromPdf(buffer) {
  const parser = new PDFParse({ data: buffer })

  try {
    const data = await parser.getText()
    return data.text || ''
  } finally {
    await parser.destroy()
  }
}

module.exports = {
  extractTextFromPdf,
}
