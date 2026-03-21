// src/pages/parcels/ParcelsPage.jsx
import { useState, useCallback } from 'react'
import { useNavigate }           from 'react-router-dom'
import { useAuth }               from '../../context/AuthContext'
import { useParcels }            from '../../hooks/useParcels'
import StatusBadge               from '../../components/ui/StatusBadge'

const STATUS_FILTERS = [
  { label: 'Tous',          value: '' },
  { label: 'Réceptionné',   value: 'received' },
  { label: 'Parti agence',  value: 'departed_agency' },
  { label: 'En vol',        value: 'departed_airport' },
  { label: 'Arrivé dest.',  value: 'arrived_destination' },
  { label: 'Retiré',        value: 'collected' },
  { label: 'Problème',      value: 'issue' },
]

const PAGE_SIZE = 15

export default function ParcelsPage() {
  const navigate  = useNavigate()
  const { isRole } = useAuth()

  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState('')
  const [page,    setPage]    = useState(1)
  const [sort,    setSort]    = useState({ field: 'createdAt', dir: 'desc' })

  // React Query re-fetch dès que l'un de ces paramètres change
  const parcels = useParcels({
    search: search || undefined,
    status: status || undefined,
    page,
    limit: PAGE_SIZE,
    sortBy:  sort.field,
    sortDir: sort.dir,
  })

  const data       = parcels.data?.rows       ?? []
  const totalCount = parcels.data?.count      ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Tri colonne — inverse si même colonne
  const handleSort = useCallback((field) => {
    setSort(prev =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'desc' }
    )
    setPage(1)
  }, [])

  const handleSearch = (e) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handleStatusFilter = (value) => {
    setStatus(value)
    setPage(1)
  }

  const SortIcon = ({ field }) => {
    if (sort.field !== field) return <span className="text-slate-300 ml-1">↕</span>
    return <span className="text-[#E8673C] ml-1">{sort.dir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{fontFamily:'var(--font-display)'}}
              className="text-xl font-bold text-[#0F1923]">
            Colis
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {totalCount} colis au total
          </p>
        </div>
        {isRole('agent_fr', 'admin') && (
          <button
            onClick={() => navigate('/parcels/new')}
            className="bg-[#E8673C] hover:bg-[#D45A30] text-white
                       text-sm font-medium px-4 py-2.5 rounded-lg
                       transition-colors"
          >
            + Nouveau colis
          </button>
        )}
      </div>

      {/* ── Barre de recherche ────────────────────────── */}
      <div className="flex items-center gap-2 bg-white border-[1.5px]
                      border-slate-200 rounded-lg px-3 py-2.5
                      focus-within:border-[#E8673C] transition-all">
        <span className="text-slate-300 text-sm">⌕</span>
        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="Code barres, expéditeur, destinataire…"
          className="flex-1 text-sm outline-none bg-transparent
                     text-[#0F1923] placeholder-slate-300"
        />
        {search && (
          <button
            onClick={() => { setSearch(''); setPage(1) }}
            className="text-slate-300 hover:text-slate-500
                       transition-colors text-sm leading-none"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Filtres statut ────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => handleStatusFilter(f.value)}
            className={`text-xs px-3 py-1.5 rounded-lg border
                        transition-all ${
              status === f.value
                ? 'bg-[#0F1923] text-white border-[#0F1923]'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Table ─────────────────────────────────────── */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">

        {/* Header table */}
        <div className="flex items-center gap-3 px-5 py-3.5
                        border-b border-slate-100">
          <p style={{fontFamily:'var(--font-display)'}}
             className="text-sm font-bold text-[#0F1923] flex-1">
            Liste des colis
          </p>
          <span className="text-xs text-slate-400 bg-slate-50
                           px-3 py-1 rounded-full">
            {totalCount} résultat{totalCount > 1 ? 's' : ''}
          </span>
        </div>

        {/* Chargement */}
        {parcels.isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#E8673C]
                            border-t-transparent rounded-full animate-spin"/>
          </div>
        )}

        {/* Table */}
        {!parcels.isLoading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {/* Code — triable */}
                  <th
                    onClick={() => handleSort('barcode')}
                    className="text-left text-[10px] font-semibold
                               text-slate-400 uppercase tracking-wide
                               px-5 py-3 cursor-pointer hover:text-slate-600
                               select-none"
                  >
                    Code <SortIcon field="barcode" />
                  </th>
                  <th className="text-left text-[10px] font-semibold
                                 text-slate-400 uppercase tracking-wide
                                 px-5 py-3">
                    Expéditeur
                  </th>
                  <th className="text-left text-[10px] font-semibold
                                 text-slate-400 uppercase tracking-wide
                                 px-5 py-3">
                    Destinataire
                  </th>
                  <th className="text-left text-[10px] font-semibold
                                 text-slate-400 uppercase tracking-wide
                                 px-5 py-3">
                    Destination
                  </th>
                  <th className="text-left text-[10px] font-semibold
                                 text-slate-400 uppercase tracking-wide
                                 px-5 py-3">
                    Sac
                  </th>
                  {/* Date — triable */}
                  <th
                    onClick={() => handleSort('createdAt')}
                    className="text-left text-[10px] font-semibold
                               text-slate-400 uppercase tracking-wide
                               px-5 py-3 cursor-pointer hover:text-slate-600
                               select-none"
                  >
                    Date <SortIcon field="createdAt" />
                  </th>
                  <th className="text-left text-[10px] font-semibold
                                 text-slate-400 uppercase tracking-wide
                                 px-5 py-3">
                    Statut
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>

              <tbody>
                {data.length === 0 && (
                  <tr>
                    <td colSpan="8"
                        className="text-center py-14 text-sm text-slate-400">
                      Aucun colis pour ce filtre.
                    </td>
                  </tr>
                )}

                {data.map(parcel => (
                  <tr
                    key={parcel.id}
                    onClick={() => navigate(`/parcels/${parcel.id}`)}
                    className="border-b border-slate-50 hover:bg-[#FDF8F6]
                               cursor-pointer transition-colors last:border-0"
                  >
                    {/* Code + date dépôt */}
                    <td className="px-5 py-3.5">
                      <p style={{fontFamily:'var(--font-display)'}}
                         className="text-xs font-semibold text-[#E8673C]">
                        {parcel.barcode}
                      </p>
                      <p className="text-[10px] text-slate-300 mt-0.5">
                        {new Date(parcel.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short',
                        })}
                      </p>
                    </td>

                    {/* Expéditeur */}
                    <td className="px-5 py-3.5 text-slate-600">
                      {parcel.sender?.name ?? '—'}
                    </td>

                    {/* Destinataire */}
                    <td className="px-5 py-3.5 text-slate-600">
                      <p>{parcel.recipientName}</p>
                      {parcel.recipientPhone && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {parcel.recipientPhone}
                        </p>
                      )}
                    </td>

                    {/* Destination */}
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {parcel.bag?.shipment?.destinationAgency?.city ?? '—'}
                    </td>

                    {/* Sac */}
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[11px] text-slate-400">
                        {parcel.bag?.barcode ?? '—'}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3.5 text-[11px] text-slate-400">
                      {new Date(parcel.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>

                    {/* Statut */}
                    <td className="px-5 py-3.5">
                      <StatusBadge status={parcel.status} />
                    </td>

                    {/* Arrow */}
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-slate-300 hover:text-[#E8673C]
                                       transition-colors text-sm">
                        →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ──────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5
                          border-t border-slate-100">
            <p className="text-xs text-slate-400">
              {((page - 1) * PAGE_SIZE) + 1}–
              {Math.min(page * PAGE_SIZE, totalCount)} sur {totalCount}
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 border border-slate-200 text-slate-500
                           rounded-lg text-xs disabled:opacity-40
                           hover:border-[#E8673C] hover:text-[#E8673C]
                           transition-all disabled:cursor-not-allowed"
              >
                ←
              </button>

              {/* Pages numérotées — affiche max 5 */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages ||
                             Math.abs(p - page) <= 1)
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && p - arr[i-1] > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '...'
                    ? <span key={`e-${i}`}
                            className="px-2 text-xs text-slate-300">…</span>
                    : <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-1.5 border rounded-lg text-xs
                                   transition-all ${
                          p === page
                            ? 'bg-[#0F1923] text-white border-[#0F1923]'
                            : 'border-slate-200 text-slate-500 hover:border-[#E8673C] hover:text-[#E8673C]'
                        }`}
                      >
                        {p}
                      </button>
                )
              }

              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-slate-200 text-slate-500
                           rounded-lg text-xs disabled:opacity-40
                           hover:border-[#E8673C] hover:text-[#E8673C]
                           transition-all disabled:cursor-not-allowed"
              >
                →
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}