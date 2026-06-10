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
}) {
  const isDisabled = disabled || !isValidUrl(qrcodeUrl)
  const tooltip = isDisabled ? 'QR code manquant ou invalide. Impossible d’imprimer.' : 'Télécharger l’étiquette'

  const downloadPDF = async () => {
    if (isDisabled) return

    // Dimensions en mm
    const widthMm = 60
    const heightMm = 50

    // Conversion mm → px (1 mm ≈ 3.78 px)
    const mmToPx = 3.78
    const widthPx = Math.round(widthMm * mmToPx)
    const heightPx = Math.round(heightMm * mmToPx)

    // QR code plus grand (0.75 au lieu de 0.6)
    const qrSizePx = Math.round(Math.min(widthPx, heightPx) * 0.75)

    // Résoudre l'URL complète du QR
    const resolvedUrl = qrcodeUrl.startsWith('http') ? qrcodeUrl : `${BASE_API_URL}/${qrcodeUrl}`

    // Créer conteneur hors écran
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
    container.style.alignItems = 'flex-start'   // aligné à gauche
    container.style.justifyContent = 'flex-start'
    container.style.padding = '10px'            // marge interne
    container.style.boxSizing = 'border-box'
    document.body.appendChild(container)

    // Wrapper pour le QR
    const qrWrapper = document.createElement('div')
    qrWrapper.style.width = `${qrSizePx}px`
    qrWrapper.style.height = `${qrSizePx}px`
    qrWrapper.style.display = 'flex'
    qrWrapper.style.alignItems = 'center'
    qrWrapper.style.justifyContent = 'center'
    qrWrapper.style.background = '#ffffff'
    container.appendChild(qrWrapper)

    // Texte du code sous le QR
    const codeText = document.createElement('div')
    codeText.style.marginTop = '8px'
    codeText.style.fontFamily = "'Courier New', Courier, monospace"
    codeText.style.fontSize = '18px'
    codeText.style.fontWeight = '700'
    codeText.style.color = '#0A1628'
    codeText.style.textAlign = 'left'           // aligné à gauche
    codeText.style.letterSpacing = '0.2px'
    codeText.style.wordBreak = 'break-word'
    codeText.style.maxWidth = `${Math.round(widthPx * 0.9)}px`
    codeText.textContent = code ?? ''
    container.appendChild(codeText)

    try {
      // Créer l'image en JS avec crossOrigin
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.style.width = '100%'
      img.style.height = '100%'
      img.style.objectFit = 'contain'
      img.style.display = 'block'

      // Attendre le chargement (ou l'erreur)
      await new Promise((resolve) => {
        img.onload = () => resolve(true)
        img.onerror = () => resolve(false)
        img.src = resolvedUrl
      })

      // Ajouter l'image au wrapper
      qrWrapper.appendChild(img)

      // Capture haute résolution
      const canvas = await html2canvas(container, {
        scale: 3,
        useCORS: true,
        width: widthPx,
        height: heightPx,
        logging: false,
        backgroundColor: 'white',
      })

      // Générer le PDF
      const pdf = new jsPDF({
        unit: 'px',
        format: [widthPx, heightPx],
        orientation: widthPx >= heightPx ? 'landscape' : 'portrait',
      })

      const imgData = canvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', 0, 0, widthPx, heightPx)
      pdf.save(`etiquette-${code ?? 'qr'}.pdf`)
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
