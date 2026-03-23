// src/pages/shipments/ShipmentsPage.jsx
import { useState }      from 'react'
import { useNavigate }   from 'react-router-dom'
import { useShipments, useCreateShipment } from '../../hooks/useShipments'
import { useAgenciesByCountry }            from '../../hooks/useAgencies'
import StatusBadge       from '../../components/ui/StatusBadge'
import Card              from '../../components/ui/Card'
import Spinner           from '../../components/ui/Spinner'

const FILTERS = [
  { label: 'Tous',           value: '' },
  { label: 'En préparation', value: 'preparing' },
  { label: 'En transit',     value: 'in_transit' },
  { label: 'Arrivés',        value: 'arrived' },
  { label: 'Problèmes',      value: 'issue' },
]

const EMPTY = { originAgencyId: '', destinationAgencyId: '', departureDate: '' }

export default function ShipmentsPage() {
  const navigate       = useNavigate()
  const [filter,       setFilter]    = useState('')
  const [showModal,    setShowModal] = useState(false)
  const [form,         setForm]      = useState(EMPTY)
  const [errs,         setErrs]      = useState({})

  const shipments      = useShipments(filter ? { status: filter } : {})
  const createShipment = useCreateShipment()
  const { agenciesFR, agenciesAF, isLoading: agLoading } = useAgenciesByCountry()

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.originAgencyId)      e.origin      = 'Requis'
    if (!form.destinationAgencyId) e.destination = 'Requis'
    if (!form.departureDate)       e.date        = 'Requis'
    setErrs(e); return Object.keys(e).length === 0
  }

  const handleCreate = async () => {
    if (!validate()) return
    await createShipment.mutateAsync(form)
    setShowModal(false); setForm(EMPTY); setErrs({})
  }

  const data = shipments.data ?? []

  const SelectField = ({ label, name, errKey, children }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500
                        uppercase tracking-wide mb-1.5">
        {label} <span className="text-violet-600">*</span>
      </label>
      <select value={form[name]} onChange={set(name)}
              className={`w-full px-4 py-3 border-2 rounded-xl text-sm outline-none
                          transition-all ${
                errs[errKey]
                  ? 'border-red-400'
                  : 'border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-100'
              }`}>
        {children}
      </select>
      {errs[errKey] && <p className="text-xs text-red-500 mt-1">{errs[errKey]}</p>}
    </div>
  )

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 style={{fontFamily:'var(--font-display)'}}
              className="text-xl md:text-2xl font-bold text-slate-900">Envois</h1>
          <p className="text-xs text-slate-400 mt-0.5">{data.length} envois</p>
        </div>
        <button onClick={() => setShowModal(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white
                           text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          + Nouvel envoi
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
                  className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-xl
                              border-2 transition-all flex-shrink-0 font-semibold ${
                    filter === f.value
                      ? 'bg-[#0A1628] text-white border-[#0A1628]'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}>
            {f.label}
          </button>
        ))}
      </div>

      {shipments.isLoading ? (
        <div className="flex justify-center py-16"><Spinner/></div>
      ) : data.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-16">Aucun envoi.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.map(s => (
            <Card key={s.id} onClick={() => navigate(`/shipments/${s.id}`)}>
              <div className="p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p style={{fontFamily:'var(--font-display)'}}
                       className="text-sm font-bold text-slate-900">{s.reference}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Départ : {new Date(s.departureDate).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}
                      {s.arrivalDate && ` · Arrivée : ${new Date(s.arrivalDate).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}`}
                    </p>
                  </div>
                  <StatusBadge status={s.status}/>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-800">{s.originAgency?.city}</span>
                  <div className="flex-1 border-t border-dashed border-slate-200"/>
                  <span className="text-slate-400 text-xs">✈️</span>
                  <div className="flex-1 border-t border-dashed border-slate-200"/>
                  <span className="font-semibold text-slate-800">{s.destinationAgency?.city}</span>
                </div>
                <div className="flex gap-4 border-t border-slate-100 pt-3">
                  {[
                    { num: s._count?.bags    ?? 0, label: 'Sacs'  },
                    { num: s._count?.parcels ?? 0, label: 'Colis' },
                  ].map(({ num, label }) => (
                    <div key={label}>
                      <p style={{fontFamily:'var(--font-display)'}}
                         className="text-base font-bold text-slate-900">{num}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                    </div>
                  ))}
                  <div className="ml-auto self-center text-slate-300 text-sm">→</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center
                        justify-center z-50 p-4 animate-fadeIn"
             onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm
                          flex flex-col gap-5 animate-slideUp md:animate-fadeIn">
            <div className="flex items-center justify-between">
              <h2 style={{fontFamily:'var(--font-display)'}}
                  className="font-bold text-slate-900 text-base">Nouvel envoi</h2>
              <button onClick={() => { setShowModal(false); setErrs({}) }}
                      className="text-slate-300 hover:text-slate-500 transition-colors text-lg">✕</button>
            </div>

            <SelectField label="Agence d'origine" name="originAgencyId" errKey="origin">
              <option value="">— Sélectionner —</option>
              {agLoading ? <option disabled>Chargement…</option>
                : agenciesFR.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </SelectField>

            <SelectField label="Agence de destination" name="destinationAgencyId" errKey="destination">
              <option value="">— Sélectionner —</option>
              {agLoading ? <option disabled>Chargement…</option>
                : agenciesAF.map(a => <option key={a.id} value={a.id}>{a.city}, {a.country}</option>)}
            </SelectField>

            <div>
              <label className="block text-xs font-semibold text-slate-500
                                uppercase tracking-wide mb-1.5">
                Date de départ <span className="text-violet-600">*</span>
              </label>
              <input type="date" value={form.departureDate} onChange={set('departureDate')}
                     className={`w-full px-4 py-3 border-2 rounded-xl text-sm outline-none
                                 transition-all ${
                       errs.date
                         ? 'border-red-400'
                         : 'border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-100'
                     }`}/>
              {errs.date && <p className="text-xs text-red-500 mt-1">{errs.date}</p>}
            </div>

            {createShipment.isError && (
              <p className="text-xs text-red-500">{createShipment.error?.message}</p>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setShowModal(false); setErrs({}) }}
                      className="flex-1 border-2 border-slate-200 text-slate-500
                                 py-3 rounded-xl text-sm font-semibold
                                 hover:border-slate-300 transition-colors">
                Annuler
              </button>
              <button onClick={handleCreate} disabled={createShipment.isPending}
                      className="flex-1 bg-violet-600 hover:bg-violet-700
                                 disabled:opacity-60 text-white font-semibold
                                 py-3 rounded-xl text-sm transition-colors
                                 flex items-center justify-center gap-2">
                {createShipment.isPending ? <><Spinner size="sm" color="white"/> Création…</> : "Créer l'envoi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}