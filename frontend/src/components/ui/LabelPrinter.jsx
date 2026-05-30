import { Printer } from 'lucide-react'

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
  destination
}) {
  const style = LABEL_STYLES[type] ?? LABEL_STYLES.parcel
  const isDisabled = disabled || !isValidUrl(qrcodeUrl)
  const tooltip = isDisabled
    ? 'QR code manquant ou invalide. Impossible d’imprimer.'
    : `Imprimer l’étiquette ${type === 'bag' ? 'sac' : 'colis'}`

  const openPrintWindow = () => {
    if (isDisabled) return

    const extraLines = [
      weight ? `Poids : ${weight} kg` : null,
      destination ? `Dest. : ${destination}` : null,
    ].filter(Boolean).join(' · ')

    const content = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Étiquette ${type}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 40mm;
      height: 30mm;
      overflow: hidden;
      background: white;
    }

    @page {
      size: 40mm 30mm;
      margin: 0;
    }

    body {
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px dashed rgba(107, 114, 128, 0.5);
    }

    @media print {
      body { border: none; }
    }

    .label {
      width: 40mm;
      height: 30mm;
      background: white;
      display: grid;
      grid-template-rows: auto 1fr auto;
      font-family: 'Inter', system-ui, sans-serif;
      border-radius: 1.5mm;
      overflow: hidden;
      box-shadow: 0 0 0 0.3mm rgba(0,0,0,0.1);
      position: relative;
    }

    .banner {
      background: ${style.banner};
      color: white;
      padding: 1.2mm 2mm;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
    }

    .body {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2mm;
      padding: 2mm;
    }

    .qrcode-wrapper {
      flex-shrink: 0;
      width: 20mm;
      height: 20mm;
      border: 0.5mm solid #e2e8f0;
      border-radius: 1mm;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
    }

    .qrcode {
      width: 18mm;
      height: 18mm;
      object-fit: contain;
    }

    .info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 1mm;
      min-width: 0;
    }

    .code-text {
      font-family: 'Courier New', monospace;
      font-size: 10px;
      font-weight: 700;
      color: #0A1628;
      line-height: 1.1;
      word-break: break-word;
      background: #f1f5f9;
      padding: 1mm 1.5mm;
      border-radius: 0.8mm;
      text-align: center;
      letter-spacing: -0.3px;
    }

    .slogan {
      font-size: 6px;
      color: #64748b;
      font-weight: 500;
      text-align: center;
      line-height: 1.2;
    }

    .extra {
      font-size: 5.5px;
      color: #334155;
      text-align: center;
      line-height: 1.3;
      margin-top: 0.5mm;
    }

    .footer {
      font-size: 5px;
      color: #94a3b8;
      text-align: center;
      padding: 1mm 2mm 1.5mm;
      border-top: 0.5px solid #e2e8f0;
      background: #fafafa;
    }

    /* Petite vague décorative en bas */
    .footer::before {
      content: '';
      display: block;
      margin: 0 auto 0.5mm;
      width: 80%;
      height: 0.3mm;
      background: repeating-linear-gradient(
        90deg,
        ${style.banner} 0mm,
        ${style.banner} 1.5mm,
        transparent 1.5mm,
        transparent 3mm
      );
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="banner">
      ${style.label}
    </div>

    <div class="body">
      <div class="qrcode-wrapper">
        <img class="qrcode" src="${qrcodeUrl}" alt="QR" />
      </div>
      <div class="info">
        <div class="code-text">${code}</div>
        <div class="slogan">${style.slogan}</div>
        ${extraLines ? `<div class="extra">${extraLines}</div>` : ''}
      </div>
    </div>

    <div class="footer">
      Scannez pour suivre votre envoi
    </div>
  </div>

  <script>
    (function() {
      function printAndClose() {
        window.print();
        window.onafterprint = function() { window.close(); };
        setTimeout(function() { window.close(); }, 4000);
      }
      if (document.readyState === 'complete') {
        printAndClose();
      } else {
        window.addEventListener('load', printAndClose);
      }
    })();
  </script>
</body>
</html>`

    const printWindow = window.open('', '_blank', 'toolbar=0,location=0,status=0,menubar=0,width=430,height=350')
    if (!printWindow) return
    printWindow.document.open()
    printWindow.document.write(content)
    printWindow.document.close()
  }

  return (
    <button
      type="button"
      onClick={openPrintWindow}
      disabled={isDisabled}
      title={tooltip}
      className={
        `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-60 ${style.button} ${className}`
      }
    >
      <Printer size={16} />
      {type === 'bag' ? 'Imprimer étiquette sac' : 'Imprimer étiquette'}
    </button>
  )
}