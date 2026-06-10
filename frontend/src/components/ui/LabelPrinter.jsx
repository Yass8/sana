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
    const widthPx = Math.round(widthMm * mmToPx) // ≈ 227px
    const heightPx = Math.round(heightMm * mmToPx) // ≈ 189px

    // Taille du QR à l'intérieur de l'étiquette (en px)
    const qrSizePx = Math.round(Math.min(widthPx, heightPx) * 0.6) // ~60% de la plus petite dimension

    const content = `
      <div class="label" style="
        width:${widthPx}px;
        height:${heightPx}px;
        background:white;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
        box-sizing:border-box;
      ">
        <div class="qrcode-wrapper" style="
          width:${qrSizePx}px;
          height:${qrSizePx}px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:#ffffff;
        ">
          <img class="qrcode" src="${BASE_API_URL}${qrcodeUrl}" alt="QR Code" style="
            width:100%;
            height:100%;
            object-fit:contain;
            display:block;
          " />
        </div>

        <div class="code-text" style="
          margin-top:8px;
          font-family: 'Courier New', Courier, monospace;
          font-size:14px;
          font-weight:700;
          color:#0A1628;
          text-align:center;
          letter-spacing:0.2px;
          word-break:break-word;
          max-width:${Math.round(widthPx * 0.9)}px;
        ">
          ${code ?? ''}
        </div>
      </div>
    `

    // Conteneur temporaire hors écran
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.top = '-9999px'
    container.style.left = '-9999px'
    container.style.width = `${widthPx}px`
    container.style.height = `${heightPx}px`
    container.style.background = 'white'
    container.style.zIndex = '9999'
    document.body.appendChild(container)

    container.innerHTML = content

    try {
      // Attendre le chargement du QR
      const img = container.querySelector('.qrcode')
      if (img && !img.complete) {
        await new Promise((resolve) => {
          img.onload = resolve
          img.onerror = resolve
        })
      }

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
