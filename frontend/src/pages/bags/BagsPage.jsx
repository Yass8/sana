// src/pages/bags/BagsPage.jsx
import { useState }      from 'react'
import { useNavigate }   from 'react-router-dom'
import { useQuery }      from '@tanstack/react-query'
import { useBags, useCreateBag } from '../../hooks/useBags'
import { shipmentsApi }  from '../../api/shipments.api'
import StatusBadge       from '../../components/ui/StatusBadge'
import Card              from '../../components/ui/Card'
import Spinner           from '../../components/ui/Spinner'
import Skeleton          from '../../components/ui/Skeleton'
import { showSuccessAlert } from '../../components/ui/SweetsAlert'

const FILTERS = [
  { label: 'Tous',       value: '' },
  { label: 'Ouverts',    value: 'open' },
  { label: 'Fermés',     value: 'closed' },
  { label: 'En transit', value: 'in_transit' },
  { label: 'Arrivés',    value: 'arrived' },
]

export default function BagsPage() {
  const navigate     = useNavigate()
  const [filter,     setFilter]    = useState('')
  const [showModal,  setShowModal] = useState(false)
  const [shipmentId, setShipmentId] = useState('')
  const [err,        setErr]       = useState('')

  const bags      = useBags(filter ? { status: filter } : {})
  const createBag = useCreateBag()

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments', { status: 'preparing' }],
    queryFn:  () => shipmentsApi.getAll({ status: 'preparing' }),
    select:   (d) => Array.isArray(d) ? d : (d?.rows ?? []),
    enabled:  showModal,
  })

  const handleCreate = async () => {
    if (!shipmentId) { setErr('Sélectionner un envoi'); return }
    await createBag.mutateAsync({ shipmentId })
    await showSuccessAlert({ text: 'Sac ajouté.' })
    setShowModal(false); setShipmentId(''); setErr('')
  }

  const data = bags.data ?? []

  return (
    <div className="flex flex-col gap-5 animate-fadeIn mb:2 md:mb-25 lg:mb-0">

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 style={{fontFamily:'var(--font-display)'}}
              className="text-xl md:text-2xl font-bold text-slate-900">Sacs</h1>
          <p className="text-xs text-slate-400 mt-0.5">{data.length} sacs</p>
        </div>
        <button onClick={() => setShowModal(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white
                           text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          + Nouveau sac
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
                  className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-xl
                              border-2 transition-all shrink-0 font-semibold ${
                    filter === f.value
                      ? 'bg-[#0A1628] text-white border-[#0A1628]'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}>
            {f.label}
          </button>
        ))}
      </div>

      {bags.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="p-5">
              <div className="space-y-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-4/5" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-16">Aucun sac.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10 md:mb-0 lg:mb-0">
          {data.map(bag => (
            <Card key={bag.id} onClick={() => navigate(`/bags/${bag.id}`)}>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p style={{fontFamily:'var(--font-display)'}}
                     className="text-sm font-bold text-violet-600">{bag.qrcode}</p>
                  <StatusBadge status={bag.status} updatedAt={bag.updatedAt} />
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  {bag.shipment?.originAgency?.city} →{' '}
                  <span className="font-semibold text-slate-700">
                    {bag.shipment?.destinationAgency?.city}
                  </span>
                </p>
                <div className="flex gap-4 border-t border-slate-100 pt-3">
                  <div>
                    <p style={{fontFamily:'var(--font-display)'}}
                       className="text-lg font-bold text-slate-900">
                      {bag.countColis?.parcels ?? 0}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">colis</p>
                  </div>
                  {bag.weight && (
                    <>
                      <div className="w-px bg-slate-100"/>
                      <div>
                        <p style={{fontFamily:'var(--font-display)'}}
                           className="text-lg font-bold text-slate-900">{bag.weight}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">kg</p>
                      </div>
                    </>
                  )}
                  <div className="ml-auto self-center text-slate-300 text-sm">→</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start md:items-center
                        justify-center z-50 p-4 animate-fadeIn"
             onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm
                          flex flex-col gap-5 animate-slideUp md:animate-fadeIn">
            <div className="flex items-center justify-between">
              <h2 style={{fontFamily:'var(--font-display)'}}
                  className="font-bold text-slate-900 text-base">Nouveau sac</h2>
              <button onClick={() => setShowModal(false)}
                      className="text-slate-300 hover:text-slate-500 transition-colors text-lg">✕</button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500
                                uppercase tracking-wide mb-1.5">
                Envoi <span className="text-violet-600">*</span>
              </label>
              <select value={shipmentId} onChange={e => setShipmentId(e.target.value)}
                      className={`w-full px-4 py-3 border-2 rounded-xl text-sm outline-none
                                  transition-all ${
                        err ? 'border-red-400' : 'border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-100'
                      }`}>
                <option value="">— Sélectionner —</option>
                {shipments.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.reference} · {s.destinationAgency?.city}
                  </option>
                ))}
              </select>
              {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
            </div>
            <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5">
              Le code-barres sera généré automatiquement.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)}
                      className="flex-1 border-2 border-slate-200 text-slate-500
                                 py-3 rounded-xl text-sm font-semibold
                                 hover:border-slate-300 transition-colors">
                Annuler
              </button>
              <button onClick={handleCreate} disabled={createBag.isPending}
                      className="flex-1 bg-violet-600 hover:bg-violet-700
                                 disabled:opacity-60 text-white font-semibold
                                 py-3 rounded-xl text-sm transition-colors
                                 flex items-center justify-center gap-2">
                {createBag.isPending ? <><Spinner size="sm" color="white"/> Création…</> : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}