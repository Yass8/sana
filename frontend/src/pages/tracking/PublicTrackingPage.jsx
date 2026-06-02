// src/pages/tracking/PublicTrackingPage.jsx
import { useState }     from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery }     from '@tanstack/react-query'
import { parcelsApi }   from '../../api/parcels.api'
import TrackingTimeline from '../../components/ui/TrackingTimeline'
import StatusBadge      from '../../components/ui/StatusBadge'
import Spinner          from '../../components/ui/Spinner'

export default function PublicTrackingPage() {
  const { qrcode: paramQRCode } = useParams()
  const navigate = useNavigate()
  const [input,  setInput]  = useState(paramQRCode ?? '')
  const [search, setSearch] = useState(paramQRCode ?? '')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-track', search],
    queryFn:  () => parcelsApi.getByQRCode(search),
    enabled:  !!search,
    retry:    false,
  })

  const handleSearch = (e) => {
    e.preventDefault()
    const code = input.trim().toUpperCase()
    setSearch(code)
    navigate(`/track/${code}`, { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Header */}
      <header className="bg-[#0A1628] px-5 py-4 flex items-center justify-between">
        <div>
          <p style={{fontFamily:'var(--font-display)'}}
             className="text-white text-lg font-bold">ColisTrack</p>
          <p className="text-violet-400 text-[10px] font-semibold
                        tracking-widest uppercase">Suivi de colis</p>
        </div>
      </header>

      {/* Contenu */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 md:py-12">
        <div className="w-full max-w-lg flex flex-col gap-6">

          {/* Titre */}
          <div className="text-center">
            <h1 style={{fontFamily:'var(--font-display)'}}
                className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
              Suivre mon colis
            </h1>
            <p className="text-sm text-slate-500">
              Entrez votre code de suivi pour voir l'état de votre colis
            </p>
          </div>

          {/* Barre de recherche */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input type="text" value={input}
                   onChange={e => setInput(e.target.value.toUpperCase())}
                   placeholder="COL-2026-00001"
                   className="flex-1 px-4 py-3.5 border-2 border-slate-200
                              rounded-xl text-sm font-mono bg-white outline-none
                              transition-all focus:border-violet-500
                              focus:ring-4 focus:ring-violet-100"/>
            <button type="submit"
                    className="bg-violet-600 hover:bg-violet-700 text-white
                               font-semibold text-sm px-5 rounded-xl
                               transition-colors whitespace-nowrap">
              Suivre
            </button>
          </form>

          {/* Chargement */}
          {isLoading && (
            <div className="flex justify-center py-10"><Spinner/></div>
          )}

          {/* Introuvable */}
          {isError && (
            <div className="text-center py-10 bg-white rounded-2xl border
                            border-slate-100 shadow-sm">
              <p className="text-4xl mb-4">📦</p>
              <p className="text-slate-500 text-sm font-semibold">Colis introuvable</p>
              <p className="text-slate-400 text-xs mt-1">
                Vérifiez votre code de suivi
              </p>
            </div>
          )}

          {/* Résultat */}
          {data && (
            <div className="bg-white rounded-2xl border border-slate-100
                            shadow-sm overflow-hidden animate-fadeIn">

              {/* En-tête */}
              <div className="px-5 py-5 border-b border-slate-100
                              flex items-start justify-between gap-4">
                <div>
                  <p style={{fontFamily:'var(--font-display)'}}
                     className="text-xl font-bold text-violet-600">
                    {data.qrcode}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Paris, France → {data.bag?.destinationAgency?.city},{' '}
                    {data.bag?.destinationAgency?.country}
                  </p>
                </div>
                <StatusBadge status={data.status} size="md"/>
              </div>

              {/* Timeline */}
              <div className="px-5 py-5">
                <TrackingTimeline
                  events={data.trackingEvents ?? []}
                  currentStatus={data.status}
                />
              </div>

              {/* Infos bas */}
              <div className="grid grid-cols-2 border-t border-slate-100">
                {[
                  { label: 'Expéditeur',   value: data.sender?.name },
                  { label: 'Destinataire', value: data.recipientName },
                  { label: 'Poids',        value: data.weight ? `${data.weight} kg` : '—' },
                  { label: 'Déposé le',    value: new Date(data.createdAt)
                      .toLocaleDateString('fr-FR', { day:'numeric', month:'long' }) },
                ].map(({ label, value }, i) => (
                  <div key={label} className={`px-5 py-4 ${i%2===0 ? 'border-r border-slate-100' : ''}`}>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-semibold text-slate-800 mt-1">{value ?? '—'}</p>
                  </div>
                ))}
              </div>

              {/* QR Code */}
              {data.qrcodeUrl && (
                <div className="px-5 py-5 border-t border-slate-100 flex flex-col
                                items-center gap-3">
                  <p className="text-xs text-slate-400">QR code de suivi</p>
                  <img src={data.qrcodeUrl} alt={data.qrcode} className="w-32 h-32"/>
                </div>
              )}

            </div>
          )}

        </div>
      </main>

    </div>
  )
}