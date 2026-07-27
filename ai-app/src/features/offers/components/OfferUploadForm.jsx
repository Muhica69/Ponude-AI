function OfferUploadForm({ isUploading, onUpload }) {
  function handleSubmit(event) {
    event.preventDefault()
    const file = event.currentTarget.offerPdf.files?.[0]

    if (file) {
      onUpload(file)
      event.currentTarget.reset()
    }
  }

  return (
    <form className="upload-panel" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">PDF ekstrakcija</p>
        <h1>Ubacivanje ponuda</h1>
        <p className="lead">
          Dodaj PDF ponudu iste strukture, a sistem će izvući firmu, projekat,
          sistem, broj ponude, broj elemenata, iznos i operatera.
        </p>
      </div>

      <label className="file-drop">
        <span className="file-icon">PDF</span>
        <strong>Prevuci ili odaberi ponudu</strong>
        <small>Podržani su PDF fajlovi do 10 MB</small>
        <input type="file" name="offerPdf" accept="application/pdf" />
      </label>

      <button type="submit" disabled={isUploading}>
        {isUploading ? 'Obrada u toku...' : 'Učitaj i izdvoji podatke'}
      </button>
    </form>
  )
}

export default OfferUploadForm
