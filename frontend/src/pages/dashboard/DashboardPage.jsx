// src/pages/dashboard/DashboardPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth }           from '../../context/AuthContext'
import { useSocket }         from '../../hooks/useSocket'
import { useDashboardStats } from '../../hooks/useDashboardStats'
import { useParcels }        from '../../hooks/useParcels'
import StatCard              from '../../components/ui/StatCard'
import StatusBadge           from '../../components/ui/StatusBadge'

// Filtres disponibles sur la liste
const FILTERS = [
  { label: 'Tous',         value: '' },
  { label: 'En transit',   value: 'departed_airport' },
  { label: 'Problèmes',    value: 'issue' },
  { label: 'Aujourd\'hui', value: 'today' },
]

export default function DashboardPage() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const [filter, setFilter] = useState('')

  // Branche le temps réel — invalide les queries quand le backend émet
  useSocket()

  const stats   = useDashboardStats()
  const parcels = useParcels(filter ? { status: filter } : {})

  const s = stats.data ?? {}

  return (
    <div className="flex flex-col gap-6">

      {/* ── En-tête ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{fontFamily:'var(--font-display)'}}
              className="text-xl font-bold text-[#0F1923]">
            Bonjour, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long'
            })}
          </p>
        </div>
        <button
          onClick={() => navigate('/scan')}
          className="flex items-center gap-2 bg-[#E8673C] hover:bg-[#D45A30]
                     text-white text-sm font-medium px-4 py-2.5 rounded-lg
                     transition-colors"
        >
          Scanner un colis
        </button>
      </div>

      {/* ── Cartes stats ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Colis aujourd'hui"
          value={s.todayCount}
          sub={s.todayDiff > 0 ? `↑ +${s.todayDiff} vs hier` : null}
          variant="light"
        />
        <StatCard
          label="Sacs en transit"
          value={s.bagsInTransit}
          variant="dark"
        />
        <StatCard
          label="Problèmes actifs"
          value={s.issues}
          variant="accent"
        />
        <StatCard
          label="Livrés ce mois"
          value={s.monthDelivered}
          variant="green"
        />
      </div>

      {/* ── Liste colis récents ──────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">

        {/* Header liste */}
        <div className="flex items-center gap-3 px-5 py-4
                        border-b border-slate-100 flex-wrap">
          <h2 style={{fontFamily:'var(--font-display)'}}
              className="text-sm font-bold text-[#0F1923] flex-1">
            Colis récents
          </h2>
          {/* Filtres */}
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
        </div>

        {/* État de chargement */}
        {parcels.isLoading && (
          <div className="py-12 text-center text-sm text-slate-400">
            Chargement…
          </div>
        )}

        {/* État vide */}
        {parcels.isSuccess && parcels.data?.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-400">
            Aucun colis pour ce filtre.
          </div>
        )}

        {/* Table */}
        {parcels.isSuccess && parcels.data?.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Code', 'Expéditeur', 'Destinataire', 'Destination', 'Statut', ''].map(h => (
                    <th key={h}
                        className="text-left text-[10px] font-semibold
                                   text-slate-400 uppercase tracking-wide
                                   px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parcels.data.map(parcel => (
                  <tr
                    key={parcel.id}
                    onClick={() => navigate(`/parcels/${parcel.id}`)}
                    className="border-b border-slate-50 hover:bg-[#FDF8F6]
                               cursor-pointer transition-colors last:border-0"
                  >
                    <td className="px-5 py-3.5">
                      <span style={{fontFamily:'var(--font-display)'}}
                            className="text-xs font-semibold text-[#E8673C]">
                        {parcel.barcode}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {parcel.sender?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {parcel.recipientName}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {parcel.bag?.shipment?.destinationAgency?.city}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={parcel.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-slate-300
                                       hover:text-[#E8673C] transition-colors">
                        →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}