// src/pages/shipments/ShipmentsPage.jsx
import { useState }    from 'react'
import { useNavigate } from 'react-router-dom'
import { useShipments, useCreateShipment } from '../../hooks/useShipments'
import { useAgenciesByCountry }            from '../../hooks/useAgencies' // ← nouveau
import StatusBadge     from '../../components/ui/StatusBadge'

const STATUS_FILTERS = [
  { label: 'Tous',           value: '' },
  { label: 'En préparation', value: 'preparing' },
  { label: 'En transit',     value: 'in_transit' },
  { label: 'Arrivés',        value: 'arrived' },
  { label: 'Problèmes',      value: 'issue' },
]

const EMPTY = { originAgencyId: '', destinationAgencyId: '', departureDate: '' }

export default function ShipmentsPage() {
  const navigate        = useNavigate()
  const [filter,        setFilter]      = useState('')
  const [showModal,     setShowModal]   = useState(false)
  const [form,          setForm]        = useState(EMPTY)
  const [formErr,       setFormErr]     = useState({})

  const shipments      = useShipments(filter ? { status: filter } : {})
  const createShipment = useCreateShipment()

  // ← Remplace l'ancien useQuery + agenciesApi.getAll
  const {
    agenciesFR,
    agenciesAF,
    isLoading: agenciesLoading,
  } = useAgenciesByCountry()

  const set = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const validate = () => {
    const errs = {}
    if (!form.originAgencyId)      errs.origin      = 'Requis'
    if (!form.destinationAgencyId) errs.destination = 'Requis'
    if (!form.departureDate)       errs.date        = 'Requis'
    setFormErr(errs)
    return Object.keys(errs).length === 0
  }

  const handleCreate = async () => {
    if (!validate()) return
    await createShipment.mutateAsync(form)
    setShowModal(false)
    setForm(EMPTY)
    setFormErr({})
  }

  const data = shipments.data ?? []

  const SelectField = ({ label, name, errKey, children }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-500
                        uppercase tracking-wide">
        {label} <span className="text-[#E8673C]">*</span>
      </label>
      <select
        value={form[name]}
        onChange={set(name)}
        className={`px-3 py-2.5 border-[1.5px] rounded-lg text-sm
                    outline-none bg-white transition-all
                    ${formErr[errKey]
                      ? 'border-red-400'
                      : 'border-slate-200 focus:border-[#E8673C]'}
                    focus:ring-2 focus:ring-[#E8673C]/10`}
      >
        {children}
      </select>
      {formErr[errKey] && (
        <p className="text-xs text-red-500">{formErr[errKey]}</p>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{fontFamily:'var(--font-display)'}}
              className="text-xl font-bold text-[#0F1923]">
            Envois
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {data.length} envoi{data.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#E8673C] hover:bg-[#D45A30] text-white
                     text-sm font-medium px-4 py-2.5 rounded-lg
                     transition-colors"
        >
          + Nouvel envoi
        </button>
      </div>

      {/* ── Filtres ───────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-xs px-3 py-1.5 rounded-lg border
                        transition-all ${
              filter === f.value
                ? 'bg-[#0F1923] text-white border-[#0F1923]'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Grille cards ──────────────────────────────── */}
      {shipments.isLoading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#E8673C]
                          border-t-transparent rounded-full animate-spin"/>
        </div>
      )}

      {shipments.isSuccess && data.length === 0 && (
        <div className="text-center py-16 text-sm text-slate-400">
          Aucun envoi pour ce filtre.
        </div>
      )}

      {shipments.isSuccess && data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.map(shipment => (
            <div
              key={shipment.id}
              onClick={() => navigate(`/shipments/${shipment.id}`)}
              className="bg-white border border-slate-100 rounded-xl p-5
                         hover:border-[#E8673C]/30 hover:shadow-sm
                         cursor-pointer transition-all flex flex-col gap-4"
            >
              {/* Référence + badge */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p style={{fontFamily:'var(--font-display)'}}
                     className="text-sm font-bold text-[#0F1923]">
                    {shipment.reference}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Départ :{' '}
                    {new Date(shipment.departureDate)
                      .toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short',
                      })}
                    {shipment.arrivalDate && (
                      <> · Arrivée :{' '}
                        {new Date(shipment.arrivalDate)
                          .toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'short',
                          })}
                      </>
                    )}
                  </p>
                </div>
                <StatusBadge status={shipment.status} />
              </div>

              {/* Route */}
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-[#0F1923]">
                  {shipment.originAgency?.city}
                </span>
                <div className="flex-1 border-t border-dashed
                                border-slate-200"/>
                <span className="text-xs text-slate-400">✈</span>
                <div className="flex-1 border-t border-dashed
                                border-slate-200"/>
                <span className="font-medium text-[#0F1923]">
                  {shipment.destinationAgency?.city}
                </span>
              </div>

              {/* Stats */}
              <div className="flex gap-0 border-t border-slate-50 pt-3">
                {[
                  { num: shipment._count?.bags    ?? 0, label: 'Sacs'  },
                  { num: shipment._count?.parcels ?? 0, label: 'Colis' },
                  { num: shipment.notes ? '📝' : '—',   label: 'Notes' },
                ].map(({ num, label }, i) => (
                  <div key={label}
                       className={`flex-1 text-center ${
                         i > 0 ? 'border-l border-slate-50' : ''
                       }`}>
                    <p style={{fontFamily:'var(--font-display)'}}
                       className="text-base font-bold text-[#0F1923]">
                      {num}
                    </p>
                    <p className="text-[9px] text-slate-400 uppercase
                                  tracking-wide mt-0.5">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal nouvel envoi ────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center
                     justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm
                          flex flex-col gap-5">

            <div className="flex items-center justify-between">
              <h2 style={{fontFamily:'var(--font-display)'}}
                  className="text-base font-bold text-[#0F1923]">
                Nouvel envoi
              </h2>
              <button
                onClick={() => { setShowModal(false); setFormErr({}) }}
                className="text-slate-300 hover:text-slate-500
                           transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Agence origine — France uniquement */}
            <SelectField label="Agence d'origine"
                         name="originAgencyId"
                         errKey="origin">
              <option value="">— Sélectionner —</option>
              {agenciesLoading
                ? <option disabled>Chargement…</option>
                : agenciesFR.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))
              }
            </SelectField>

            {/* Agence destination — Afrique uniquement */}
            <SelectField label="Agence de destination"
                         name="destinationAgencyId"
                         errKey="destination">
              <option value="">— Sélectionner —</option>
              {agenciesLoading
                ? <option disabled>Chargement…</option>
                : agenciesAF.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.city}, {a.country}
                    </option>
                  ))
              }
            </SelectField>

            {/* Date de départ */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500
                                uppercase tracking-wide">
                Date de départ <span className="text-[#E8673C]">*</span>
              </label>
              <input
                type="date"
                value={form.departureDate}
                onChange={set('departureDate')}
                className={`px-3 py-2.5 border-[1.5px] rounded-lg text-sm
                            outline-none bg-white transition-all
                            ${formErr.date
                              ? 'border-red-400'
                              : 'border-slate-200 focus:border-[#E8673C]'}
                            focus:ring-2 focus:ring-[#E8673C]/10`}
              />
              {formErr.date && (
                <p className="text-xs text-red-500">{formErr.date}</p>
              )}
            </div>

            {createShipment.isError && (
              <p className="text-xs text-red-500">
                {createShipment.error?.message ?? 'Erreur lors de la création.'}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowModal(false); setFormErr({}) }}
                className="flex-1 border border-slate-200 text-slate-500
                           py-2.5 rounded-lg text-sm transition-colors
                           hover:border-slate-300"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={createShipment.isPending}
                className="flex-1 bg-[#E8673C] hover:bg-[#D45A30]
                           disabled:opacity-60 text-white font-medium
                           text-sm py-2.5 rounded-lg transition-colors"
              >
                {createShipment.isPending ? 'Création…' : "Créer l'envoi"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}