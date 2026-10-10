// src/pages/parcels/ParcelsPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Package,
  Plus,
  Search,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useParcels } from '../../hooks/useParcels'
import StatusBadge from '../../components/ui/StatusBadge'

// ────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────
const FILTERS = [
  { label: 'Tous',        value: '' },
  { label: 'Réceptionné', value: 'received' },
  { label: 'En vol',      value: 'departed_airport' },
  { label: 'Arrivé',      value: 'arrived_destination' },
  { label: 'Retiré',      value: 'collected' },
  { label: 'Problème',    value: 'issue' },
]

const PAGE_SIZE = 15

// ────────────────────────────────────────────────────────────
// SortIcon
// ────────────────────────────────────────────────────────────
function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) {
    return <ArrowUpDown size={12} className="ml-1 text-slate-300" />
  }
  return sortDir === 'asc'
    ? <ArrowUp size={12} className="ml-1 text-slate-700" />
    : <ArrowDown size={12} className="ml-1 text-slate-700" />
}

// ────────────────────────────────────────────────────────────
// Skeleton
// ────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div
            className="h-3 animate-pulse rounded bg-slate-100"
            style={{ width: `${50 + i * 8}%` }}
          />
        </td>
      ))}
    </tr>
  )
}

// ────────────────────────────────────────────────────────────
// Pagination
// ────────────────────────────────────────────────────────────
function buildPageList(current, total) {
  return Array.from({ length: total }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === total || Math.abs(p - current) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
      acc.push(p)
      return acc
    }, [])
}

function Pagination({ page, totalPages, totalCount, onChange }) {
  if (totalPages <= 1) return null
  const from = (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, totalCount)

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        <span className="tabular-nums">{from}</span>–
        <span className="tabular-nums">{to}</span> sur{' '}
        <span className="tabular-nums">{totalCount}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Page précédente"
        >
          <ChevronLeft size={14} />
        </button>

        {buildPageList(page, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="px-1.5 text-xs text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium tabular-nums transition ${
                p === page
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Page suivante"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────
export default function ParcelsPage() {
  const navigate = useNavigate()
  const { isRole } = useAuth()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState({ field: 'createdAt', dir: 'DESC' })

  const parcels = useParcels({
    status: status || undefined,
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
    sortBy: sort.field,
    sortDir: sort.dir,
  })

  const data = parcels.data?.rows ?? []
  const totalCount = parcels.data?.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const isLoading = parcels.isLoading

  const handleSort = (field) => {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'desc' }
    )
    setPage(1)
  }

  const handleSearch = (value) => {
    setSearch(value)
    setPage(1)
  }

  const handleStatus = (value) => {
    setStatus(value)
    setPage(1)
  }

  const hasFilters = Boolean(search || status)
  const canCreate = isRole('agent_fr', 'admin')

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-10">
      {/* En-tête */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Colis
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            <span className="tabular-nums">{totalCount}</span> colis{' '}
            {hasFilters ? 'correspondant aux filtres' : 'enregistrés'}
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => navigate('/parcels/new')}
            className="inline-flex h-9 items-center gap-2 self-start rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 sm:self-auto"
          >
            <Plus size={14} />
            Nouveau colis
          </button>
        )}
      </header>

      {/* Section tableau + toolbar */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
            {FILTERS.map((f) => {
              const active = status === f.value
              return (
                <button
                  key={f.value || 'all'}
                  type="button"
                  onClick={() => handleStatus(f.value)}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              )
            })}
          </div>

          <div className="relative lg:w-72">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Code, expéditeur, destinataire…"
              className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-8 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearch('')}
                className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Effacer la recherche"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Chargement — desktop */}
        {isLoading && (
          <>
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-100 md:hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3 px-4 py-3.5">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </>
        )}

        {/* État vide */}
        {!isLoading && data.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              {hasFilters ? <Search size={18} /> : <Package size={18} />}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                {hasFilters
                  ? 'Aucun colis ne correspond à ces critères'
                  : 'Aucun colis enregistré'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {hasFilters
                  ? 'Modifiez le filtre ou la recherche pour élargir les résultats.'
                  : 'Créez un nouveau colis pour démarrer le suivi.'}
              </p>
            </div>
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setStatus('')
                  setPage(1)
                }}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Réinitialiser les filtres
              </button>
            ) : canCreate ? (
              <button
                type="button"
                onClick={() => navigate('/parcels/new')}
                className="mt-1 inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <Plus size={14} />
                Nouveau colis
              </button>
            ) : null}
          </div>
        )}

        {/* Vue mobile */}
        {!isLoading && data.length > 0 && (
          <div className="divide-y divide-slate-100 md:hidden">
            {data.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/parcels/${p.id}`)}
                className="cursor-pointer px-4 py-3.5 transition hover:bg-slate-50/70"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-medium text-slate-900">
                    {p.qrcode}
                  </span>
                  <StatusBadge status={p.status} updatedAt={p.updatedAt} />
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {p.sender?.name ?? '—'} → {p.recipientName ?? '—'}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {new Date(p.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Vue desktop */}
        {!isLoading && data.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
                  <th
                    onClick={() => handleSort('qrcode')}
                    className="cursor-pointer select-none px-4 py-2.5 text-left font-medium transition hover:text-slate-700"
                  >
                    <span className="inline-flex items-center">
                      Code
                      <SortIcon field="qrcode" sortField={sort.field} sortDir={sort.dir} />
                    </span>
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium">Expéditeur</th>
                  <th className="px-4 py-2.5 text-left font-medium">Destinataire</th>
                  <th className="px-4 py-2.5 text-left font-medium">Destination</th>
                  <th className="px-4 py-2.5 text-left font-medium">Sac</th>
                  <th className="px-4 py-2.5 text-left font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/parcels/${p.id}`)}
                    className="cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-mono text-sm font-medium text-slate-900">
                        {p.qrcode}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        {new Date(p.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      {p.sender?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      {p.recipientName ?? '—'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {p.bag?.destinationAgency?.city ?? '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs text-slate-500">
                        {p.bag?.qrcode ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={p.status} updatedAt={p.updatedAt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && data.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            onChange={setPage}
          />
        )}
      </section>
    </div>
  )
}