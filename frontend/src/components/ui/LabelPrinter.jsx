import { Printer } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const LABEL_STYLES = {
  parcel: {
    label: 'COLIS',
    button: 'bg-[#7C3AED] hover:bg-[#5B21B6]',
    banner: '#7C3AED',
    slogan: 'Expédition suivie',
  },
  bag: {
    label: 'SAC',
    button: 'bg-[#0A1628] hover:bg-slate-800',
    banner: '#0A1628',
    slogan: 'Sac de groupage',
  },
}

function isValidUrl(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export default function LabelPrinter({
  type,
  code,
  qrcodeUrl,
  disabled = false,
  className = '',
  weight,
  destination,
}) {
  const style = LABEL_STYLES[type] ?? LABEL_STYLES.parcel
  const isDisabled = disabled || !isValidUrl(qrcodeUrl)
  const tooltip = isDisabled
    ? 'QR code manquant ou invalide. Impossible d’imprimer.'
    : `Télécharger l’étiquette ${type === 'bag' ? 'sac' : 'colis'}`

  const downloadPDF = async () => {
    if (isDisabled) return

    const extraLines = [
      weight ? `Poids : ${weight} kg` : null,
      destination ? `Dest. : ${destination}` : null,
    ]
      .filter(Boolean)
      .join(' · ')

    // Conversion mm → px (1mm ≈ 3.78px)
    const widthPx = Math.round(40 * 3.78) // 151px
    const heightPx = Math.round(30 * 3.78) // 113px

    // Construction du HTML de l'étiquette
    const content = `
      <div class="label" style="width:${widthPx}px;height:${heightPx}px;background:white;display:grid;grid-template-rows:auto 1fr auto;font-family:'Inter',system-ui,sans-serif;border-radius:5px;overflow:hidden;box-shadow:0 0 0 1px rgba(0,0,0,0.1);">
        <div class="banner" style="background:${style.banner};color:white;padding:4px 7px;font-size:9px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;display:flex;align-items:center;justify-content:center;gap:3px;">
          ${style.label}
        </div>
        <div class="body" style="display:flex;align-items:center;justify-content:center;gap:6px;padding:6px;">
          <div class="qrcode-wrapper" style="flex-shrink:0;width:${Math.round(20 * 3.78)}px;height:${Math.round(20 * 3.78)}px;border:1px solid #e2e8f0;border-radius:3px;display:flex;align-items:center;justify-content:center;background:#fff;">
            <img class="qrcode" src="${qrcodeUrl}" alt="QR" style="width:${Math.round(18 * 3.78)}px;height:${Math.round(18 * 3.78)}px;object-fit:contain;" />
          </div>
          <div class="info" style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:3px;min-width:0;">
            <div class="code-text" style="font-family:'Courier New',monospace;font-size:10px;font-weight:700;color:#0A1628;line-height:1.1;word-break:break-word;background:#f1f5f9;padding:3px 5px;border-radius:3px;text-align:center;letter-spacing:-0.3px;">
              ${code}
            </div>
            <div class="slogan" style="font-size:6px;color:#64748b;font-weight:500;text-align:center;line-height:1.2;">
              ${style.slogan}
            </div>
            ${extraLines ? `<div class="extra" style="font-size:5.5px;color:#334155;text-align:center;line-height:1.3;margin-top:1px;">${extraLines}</div>` : ''}
          </div>
        </div>
        <div class="footer" style="font-size:5px;color:#94a3b8;text-align:center;padding:3px 7px 5px;border-top:0.5px solid #e2e8f0;background:#fafafa;">
          Scannez pour suivre votre envoi
        </div>
      </div>
    `

    // Créer un conteneur temporaire visible
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
      // Attendre le chargement de l'image QR
      const img = container.querySelector('.qrcode')
      if (img && !img.complete) {
        await new Promise((resolve) => {
          img.onload = resolve
          img.onerror = resolve
        })
      }

      // Capturer l'élément avec html2canvas
      const canvas = await html2canvas(container, {
        scale: 3, // Haute résolution
        useCORS: true,
        width: widthPx,
        height: heightPx,
        logging: false,
        backgroundColor: 'white',
      })

      // Créer le PDF avec jsPDF
      const pdf = new jsPDF({
        unit: 'px',
        format: [widthPx, heightPx],
        orientation: 'landscape',
      })

      const imgData = canvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', 0, 0, widthPx, heightPx)
      pdf.save(`etiquette-${code}.pdf`)
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
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-60 ${style.button} ${className}`}
    >
      <Printer size={16} />
      {type === 'bag' ? 'Télécharger étiquette sac' : 'Télécharger étiquette'}
    </button>
  )
}