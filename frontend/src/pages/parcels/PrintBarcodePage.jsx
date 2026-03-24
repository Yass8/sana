// src/pages/parcels/PrintQRCodePage.jsx
import { useParams, useNavigate } from 'react-router-dom'
import { useParcel }              from '../../hooks/useParcels'
import { useRef }                 from 'react'

export default function PrintQRCodePage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const printRef  = useRef(null)

  const { data: parcel, isLoading } = useParcel(id)

  const handlePrint = () => {
    const content = printRef.current.innerHTML
    const win     = window.open('', '_blank')
    win.document.write(`
      <html>
        <head>
          <title>Code-barres ${parcel?.qrcode}</title>
          <style>
            body { margin: 0; display: flex; flex-direction: column;
                   align-items: center; justify-content: center;
                   min-height: 100vh; font-family: monospace; }
            .label { text-align: center; padding: 20px; }
                     border: 2px solid #000; border-radius: 8px; }
            img { max-width: 300px; display: block; margin: 0 auto; }
            p   { margin: 8px 0 0; font-size: 14px; font-weight: bold; }
            small { font-size: 11px; color: #666; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-6 h-6 border-2 border-[#E8673C]
                      border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  if (!parcel) return (
    <div className="text-center py-20 text-slate-400 text-sm">
      Colis introuvable.
    </div>
  )

  return (
    <div className="max-w-sm mx-auto flex flex-col gap-6 py-8">

      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
                className="text-slate-400 hover:text-[#E8673C]
                           transition-colors text-sm">
          ← Retour
        </button>
        <h1 style={{fontFamily:'var(--font-display)'}}
            className="text-lg font-bold text-[#0F1923]">
          Imprimer le code-barres
        </h1>
      </div>

      {/* Zone d'impression */}
      <div ref={printRef}
           className="label bg-white border-2 border-slate-200
                      rounded-xl p-6 text-center">
        {parcel.qrcodeUrl ? (
          <img
            src={parcel.qrcodeUrl}
            alt={parcel.qrcode}
            className="w-full max-w-[260px] mx-auto"
          />
        ) : (
          <p className="text-slate-400 text-sm py-8">
            Code-barres non généré.
          </p>
        )}
        <p style={{fontFamily:'var(--font-display)'}}
           className="mt-3 text-sm font-bold text-[#0F1923]">
          {parcel.qrcode}
        </p>
        <small className="text-xs text-slate-400 block mt-1">
          {parcel.recipientName} — {parcel.bag?.shipment?.destinationAgency?.city}
        </small>
      </div>

      {/* Infos colis */}
      <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-2">
        {[
          { label: 'Expéditeur',   value: parcel.sender?.name },
          { label: 'Destinataire', value: parcel.recipientName },
          { label: 'Poids',        value: parcel.weight ? `${parcel.weight} kg` : '—' },
          { label: 'Description',  value: parcel.description ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-slate-400">{label}</span>
            <span className="text-[#0F1923] font-medium">{value ?? '—'}</span>
          </div>
        ))}
      </div>

      <button
        onClick={handlePrint}
        className="bg-[#0F1923] hover:bg-[#1A2736] text-white
                   font-medium py-3 rounded-xl text-sm transition-colors"
      >
        Imprimer
      </button>

    </div>
  )
}