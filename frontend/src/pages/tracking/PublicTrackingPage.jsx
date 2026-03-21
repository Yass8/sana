// src/pages/tracking/PublicTrackingPage.jsx
import { useState }        from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery }        from '@tanstack/react-query'
import { parcelsApi }      from '../../api/parcels.api'
import TrackingTimeline    from '../../components/ui/TrackingTimeline'
import StatusBadge         from '../../components/ui/StatusBadge'

export default function PublicTrackingPage() {
  const { barcode: paramBarcode } = useParams()
  const navigate = useNavigate()
  const [input, setInput] = useState(paramBarcode ?? '')
  const [search, setSearch] = useState(paramBarcode ?? '')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-track', search],
    queryFn:  () => parcelsApi.getByBarcode(search),
    enabled:  !!search,
    retry:    false,
  })

  const handleSearch = (e) => {
    e.preventDefault()
    const code = input.trim().toUpperCase()
    setSearch(code)
    // Met à jour l'URL sans recharger la page
    navigate(`/track/${code}`, { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col">

      {/* ── Header ──────────────────────────────────────── */}
      <header className="bg-[#0F1923] px-6 py-4 flex items-center
                         justify-between">
        <div>
          <p style={{fontFamily:'var(--font-display)'}}
             className="text-[#F0EDE8] text-lg font-extrabold">
            ColisTrack
          </p>
          <p className="text-[#E8673C] text-[10px] font-semibold
                        tracking-widest uppercase">
            Suivi de colis
          </p>
        </div>
      </header>

      {/* ── Contenu ─────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-lg flex flex-col gap-6">

          {/* Barre de recherche */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              placeholder="COL-2026-00042"
              className="flex-1 px-4 py-3 border-[1.5px] border-slate-200
                         rounded-xl text-sm font-mono bg-white outline-none
                         focus:border-[#E8673C] focus:ring-2
                         focus:ring-[#E8673C]/10 transition-all"
            />
            <button
              type="submit"
              className="bg-[#E8673C] hover:bg-[#D45A30] text-white
                         font-medium text-sm px-5 rounded-xl
                         transition-colors"
            >
              Suivre
            </button>
          </form>

          {/* Chargement */}
          {isLoading && (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-[#E8673C]
                              border-t-transparent rounded-full
                              animate-spin" />
            </div>
          )}

          {/* Introuvable */}
          {isError && (
            <div className="text-center py-10">
              <p className="text-4xl mb-4">📦</p>
              <p className="text-slate-400 text-sm">
                Aucun colis trouvé pour ce code.
              </p>
            </div>
          )}

          {/* Résultat */}
          {data && (
            <div className="bg-white border border-slate-100
                            rounded-2xl overflow-hidden">

              {/* En-tête résultat */}
              <div className="px-6 py-5 border-b border-slate-50
                              flex items-start justify-between gap-4">
                <div>
                  <p style={{fontFamily:'var(--font-display)'}}
                     className="text-xl font-bold text-[#0F1923]">
                    {data.barcode}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Paris, France →{' '}
                    {data.bag?.shipment?.destinationAgency?.city},{' '}
                    {data.bag?.shipment?.destinationAgency?.country}
                  </p>
                </div>
                <StatusBadge status={data.status} />
              </div>

              {/* Timeline */}
              <div className="px-6 py-5">
                <TrackingTimeline
                  events={data.trackingEvents ?? []}
                  currentStatus={data.status}
                />
              </div>

              {/* Infos bas */}
              <div className="grid grid-cols-2 border-t border-slate-50">
                {[
                  { label: 'Expéditeur',    value: data.sender?.name },
                  { label: 'Destinataire',  value: data.recipientName },
                  { label: 'Poids',         value: data.weight ? `${data.weight} kg` : '—' },
                  { label: 'Déposé le',     value: new Date(data.createdAt)
                      .toLocaleDateString('fr-FR', { day:'numeric', month:'long' }) },
                ].map(({ label, value }, i) => (
                  <div key={label}
                       className={`px-6 py-4 ${i % 2 === 0
                         ? 'border-r border-slate-50' : ''}`}>
                    <p className="text-[10px] text-slate-400 uppercase
                                  tracking-wide mb-1">{label}</p>
                    <p className="text-sm text-[#0F1923] font-medium">
                      {value ?? '—'}
                    </p>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>
      </main>

    </div>
  )
}