// src/pages/bags/BagsPage.jsx
import { useState }    from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery }    from '@tanstack/react-query'
import { useBags, useCreateBag } from '../../hooks/useBags'
import { agenciesApi } from '../../api/agencies.api' // à créer
import StatusBadge     from '../../components/ui/StatusBadge'

// Filtres de statut
const FILTERS = [
  { label: 'Tous',       value: '' },
  { label: 'Ouverts',    value: 'open' },
  { label: 'Fermés',     value: 'closed' },
  { label: 'En transit', value: 'in_transit' },
  { label: 'Arrivés',    value: 'arrived' },
]

const EMPTY_FORM = { shipmentId: '', destinationAgencyId: '' }

export default function BagsPage() {
  const navigate    = useNavigate()
  const [filter,    setFilter]    = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [formErr,   setFormErr]   = useState({})

  const bags      = useBags(filter ? { status: filter } : {})
  const createBag = useCreateBag()

  // Shipments en cours de préparation (pour le select)
  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments', { status: 'preparing' }],
    queryFn:  () => api.get('/shipments', { params: { status: 'preparing' } }),
    enabled:  showModal,
  })

  const set = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleCreate = async () => {
    const errs = {}
    if (!form.shipmentId) errs.shipmentId = 'Requis'
    setFormErr(errs)
    if (Object.keys(errs).length > 0) return

    await createBag.mutateAsync(form)
    setShowModal(false)
    setForm(EMPTY_FORM)
  }

  const data = bags.data ?? []

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{fontFamily:'var(--font-display)'}}
              className="text-xl font-bold text-[#0F1923]">
            Sacs
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {data.length} sac{data.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#E8673C] hover:bg-[#D45A30] text-white
                     text-sm font-medium px-4 py-2.5 rounded-lg
                     transition-colors"
        >
          + Nouveau sac
        </button>
      </div>

      {/* ── Filtres ─────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              filter === f.value
                ? 'bg-[#0F1923] text-white border-[#0F1923]'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Grille de cartes ────────────────────────────── */}
      {bags.isLoading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#E8673C]
                          border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {bags.isSuccess && data.length === 0 && (
        <div className="text-center py-16 text-sm text-slate-400">
          Aucun sac pour ce filtre.
        </div>
      )}

      {bags.isSuccess && data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(bag => (
            <div
              key={bag.id}
              onClick={() => navigate(`/bags/${bag.id}`)}
              className="bg-white border border-slate-100 rounded-xl p-5
                         hover:border-[#E8673C]/30 hover:shadow-sm
                         cursor-pointer transition-all group"
            >
              {/* Ligne haut : code + badge */}
              <div className="flex items-start justify-between gap-2 mb-4">
                <p style={{fontFamily:'var(--font-display)'}}
                   className="text-sm font-bold text-[#E8673C]">
                  {bag.barcode}
                </p>
                <StatusBadge status={bag.status} />
              </div>

              {/* Route */}
              <p className="text-xs text-slate-500 mb-3">
                {bag.shipment?.originAgency?.city} →{' '}
                <span className="font-medium text-[#0F1923]">
                  {bag.shipment?.destinationAgency?.city}
                </span>
              </p>

              {/* Stats internes */}
              <div className="flex gap-3">
                <div className="flex flex-col">
                  <span style={{fontFamily:'var(--font-display)'}}
                        className="text-lg font-bold text-[#0F1923]">
                    {bag._count?.parcels ?? 0}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase
                                   tracking-wide">colis</span>
                </div>
                {bag.weight && (
                  <>
                    <div className="w-px bg-slate-100" />
                    <div className="flex flex-col">
                      <span style={{fontFamily:'var(--font-display)'}}
                            className="text-lg font-bold text-[#0F1923]">
                        {bag.weight}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase
                                       tracking-wide">kg</span>
                    </div>
                  </>
                )}
                <div className="ml-auto self-end text-slate-300
                                group-hover:text-[#E8673C] transition-colors">
                  →
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal nouveau sac ───────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center
                     justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm
                          flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 style={{fontFamily:'var(--font-display)'}}
                  className="text-base font-bold text-[#0F1923]">
                Nouveau sac
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-300 hover:text-slate-500
                           transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Sélection de l'envoi */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500
                                uppercase tracking-wide">
                Envoi <span className="text-[#E8673C]">*</span>
              </label>
              <select
                value={form.shipmentId}
                onChange={set('shipmentId')}
                className={`px-3 py-2.5 border-[1.5px] rounded-lg text-sm
                            outline-none bg-white transition-all
                            ${formErr.shipmentId
                              ? 'border-red-400'
                              : 'border-slate-200 focus:border-[#E8673C]'}
                            focus:ring-2 focus:ring-[#E8673C]/10`}
              >
                <option value="">— Sélectionner un envoi —</option>
                {shipments.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.reference} · {s.destinationAgency?.city}
                  </option>
                ))}
              </select>
              {formErr.shipmentId && (
                <p className="text-xs text-red-500">{formErr.shipmentId}</p>
              )}
            </div>

            <p className="text-xs text-slate-400 bg-slate-50
                          rounded-lg px-3 py-2.5">
              Le code-barres du sac sera généré automatiquement
              après la création.
            </p>

            {createBag.isError && (
              <p className="text-xs text-red-500">
                {createBag.error?.message ?? 'Erreur lors de la création.'}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-200 text-slate-500
                           py-2.5 rounded-lg text-sm font-medium
                           hover:border-slate-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={createBag.isPending}
                className="flex-1 bg-[#E8673C] hover:bg-[#D45A30]
                           disabled:opacity-60 text-white font-medium
                           text-sm py-2.5 rounded-lg transition-colors"
              >
                {createBag.isPending ? 'Création…' : 'Créer le sac'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}