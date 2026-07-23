import { Printer } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const BASE_API_URL = import.meta.env.VITE_BASE_API_URL

function isValidUrl(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export default function LabelPrinter({
  code,
  qrcodeUrl,
  disabled = false,
  className = '',
  recipientInfo = '',
  bag = false,
  pieceNumber = 1,
  totalPieces = 1 
}) {
  const isDisabled = disabled || !isValidUrl(qrcodeUrl)
  const tooltip = isDisabled
    ? 'QR code manquant ou invalide. Impossible d’imprimer.'
    : 'Télécharger l’étiquette'

  // Construction du code affiché
  const displayCode =
    totalPieces > 1 ? `${code}(${pieceNumber}/${totalPieces})` : code

  const downloadPDF = async () => {
    if (isDisabled) return

    const widthMm = 60
    const heightMm = 60
    const mmToPx = 3.78
    const widthPx = Math.round(widthMm * mmToPx)
    const heightPx = Math.round(heightMm * mmToPx)
    const qrSizePx = Math.round(Math.min(widthPx, heightPx) * 0.75)

    const resolvedUrl = qrcodeUrl.startsWith('http')
      ? qrcodeUrl
      : `${BASE_API_URL}/${qrcodeUrl}`

    // Conteneur hors écran (identique à l'original)
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.top = '-9999px'
    container.style.left = '-9999px'
    container.style.width = `${widthPx}px`
    container.style.height = `${heightPx}px`
    container.style.background = 'white'
    container.style.zIndex = '9999'
    container.style.display = 'flex'
    container.style.flexDirection = 'column'
    container.style.alignItems = 'flex-start'
    container.style.justifyContent = 'flex-start'
    container.style.padding = '10px'
    container.style.boxSizing = 'border-box'
    document.body.appendChild(container)

    const qrWrapper = document.createElement('div')
    qrWrapper.style.width = `${qrSizePx}px`
    qrWrapper.style.height = `${qrSizePx}px`
    qrWrapper.style.display = 'flex'
    qrWrapper.style.alignItems = 'center'
    qrWrapper.style.justifyContent = 'center'
    qrWrapper.style.background = '#ffffff'
    container.appendChild(qrWrapper)

    const codeText = document.createElement('div')
    codeText.style.fontFamily = "'Courier New', Courier, monospace"
    codeText.style.fontSize = '18px'
    codeText.style.fontWeight = '700'
    codeText.style.color = '#0A1628'
    codeText.style.textAlign = 'left'
    codeText.style.letterSpacing = '0.2px'
    codeText.style.wordBreak = 'break-word'
    codeText.style.maxWidth = `${Math.round(widthPx * 0.9)}px`
    codeText.textContent = displayCode   // ← on utilise displayCode
    container.appendChild(codeText)

    if (bag === false && recipientInfo.length > 0) {
      const footerText = document.createElement('div')
      footerText.style.marginBottom = '2px'
      footerText.style.fontFamily = "'Courier New', Courier, monospace"
      footerText.style.fontSize = '20px'
      footerText.style.fontWeight = '500'
      footerText.style.color = '#0A1628'
      footerText.style.textAlign = 'left'
      footerText.textContent = recipientInfo
      container.appendChild(footerText)
    }

    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.style.width = '100%'
      img.style.height = '100%'
      img.style.objectFit = 'contain'
      img.style.display = 'block'

      await new Promise((resolve) => {
        img.onload = () => resolve(true)
        img.onerror = () => resolve(false)
        img.src = resolvedUrl
      })

      qrWrapper.appendChild(img)

      const canvas = await html2canvas(container, {
        scale: 3,
        useCORS: true,
        width: widthPx,
        height: heightPx,
        logging: false,
        backgroundColor: 'white',
      })

      const pdf = new jsPDF({
        unit: 'px',
        format: [widthPx, heightPx],
        orientation: widthPx >= heightPx ? 'landscape' : 'portrait',
      })

      const imgData = canvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', 0, 0, widthPx, heightPx)
      // Le nom du fichier peut aussi refléter la pièce
      pdf.save(`etiquette-${displayCode ?? 'qr'}.pdf`)
    } finally {
      document.body.removeChild(container)
    }
  }

  return (
    <button
      type="button"
      onClick={downloadPDF}
      disabled={isDisabled}
      title={tooltip}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-60 bg-[#7C3AED] hover:bg-[#5B21B6] ${className}`}
    >
      <Printer size={16} />
      Télécharger étiquette
    </button>
  )
}