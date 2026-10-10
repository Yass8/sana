// src/pages/bags/BagsPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Loader2, Package, Plus, Search, X } from 'lucide-react'
import { useBags, useCreateBag } from '../../hooks/useBags'
import { agenciesApi } from '../../api/agencies.api'
import StatusBadge from '../../components/ui/StatusBadge'
import { showSuccessAlert } from '../../components/ui/SweetsAlert'

// ────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────
const FILTERS = [
  { label: 'Tous',       value: '' },
  { label: 'Ouverts',    value: 'ouvert' },
  { label: 'Fermés',     value: 'fermé' },
  { label: 'En transit', value: 'en_transit' },
  { label: 'Arrivés',    value: 'arrivé' },
  { label: 'Problèmes',  value: 'issue' },
]

// ────────────────────────────────────────────────────────────
// BagCard
// ────────────────────────────────────────────────────────────
function BagCard({ bag, onClick }) {
  const parcelCount = bag.countColis?.parcels ?? 0

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:shadow-sm"
    >
      {/* Ligne 1 : code + statut */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-sm font-medium text-slate-900">
          {bag.qrcode}
        </span>
        <StatusBadge status={bag.status} updatedAt={bag.updatedAt} />
      </div>

      {/* Ligne 2 : trajet */}
      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
        <span className="truncate">{bag.originAgency?.city ?? '—'}</span>
        <ArrowRight size={12} className="shrink-0 text-slate-300" />
        <span className="truncate font-medium text-slate-700">
          {bag.destinationAgency?.city ?? '—'}
        </span>
      </div>

      {/* Ligne 3 : stats */}
      <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3">
        <div>
          <p className="text-base font-semibold tabular-nums text-slate-900">
            {parcelCount}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">
            colis
          </p>
        </div>

        {bag.weight ? (
          <>
            <div className="h-6 w-px bg-slate-100" />
            <div>
              <p className="text-base font-semibold tabular-nums text-slate-900">
                {bag.weight}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                kg
              </p>
            </div>
          </>
        ) : null}

        <ArrowRight
          size={14}
          className="ml-auto text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"
        />
      </div>
    </button>
  )
}

// ────────────────────────────────────────────────────────────
// Skeleton
// ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
      <div className="mt-4 flex gap-4 border-t border-slate-100 pt-3">
        <div className="h-8 w-12 animate-pulse rounded bg-slate-100" />
        <div className="h-8 w-12 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Modal — Nouveau sac
// ────────────────────────────────────────────────────────────
function CreateBagModal({ open, onClose, agencies, onCreate, isPending }) {
  const [originAgencyId, setOriginAgencyId] = useState('')
  const [destinationAgencyId, setDestinationAgencyId] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [err, setErr] = useState('')

  // Défauts intelligents
  useEffect(() => {
    if (!open || !agencies.length) return
    if (!originAgencyId) {
      const paris = agencies.find((a) => a.city === 'Paris')
      if (paris) setOriginAgencyId(paris.id)
    }
    if (!destinationAgencyId) {
      const moroni = agencies.find((a) => a.city === 'Moroni')
      if (moroni) setDestinationAgencyId(moroni.id)
    }
  }, [open, agencies, originAgencyId, destinationAgencyId])

  // Reset à l'ouverture
  useEffect(() => {
    if (open) {
      setErr('')
    }
  }, [open])

  if (!open) return null

  const handleSubmit = async () => {
    if (!originAgencyId || !destinationAgencyId) {
      setErr('Sélectionnez une origine et une destination.')
      return
    }
    if (originAgencyId === destinationAgencyId) {
      setErr("L'origine et la destination doivent être différentes.")
      return
    }
    setErr('')
    await onCreate({ originAgencyId, destinationAgencyId, departureDate })
    setOriginAgencyId('')
    setDestinationAgencyId('')
    setDepartureDate('')
  }

  const inputClass = (invalid) =>
    `h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-800 outline-none transition ${
      invalid
        ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
        : 'border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900'
    }`

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Nouveau sac
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Le code-barres sera généré automatiquement.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Corps */}
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              Origine <span className="text-rose-500">*</span>
            </label>
            <select
              value={originAgencyId}
              onChange={(e) => setOriginAgencyId(e.target.value)}
              className={inputClass(Boolean(err) && !originAgencyId)}
            >
              <option value="">— Sélectionner une agence —</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.city} · {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              Destination <span className="text-rose-500">*</span>
            </label>
            <select
              value={destinationAgencyId}
              onChange={(e) => setDestinationAgencyId(e.target.value)}
              className={inputClass(Boolean(err) && !destinationAgencyId)}
            >
              <option value="">— Sélectionner une agence —</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.city} · {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              Date de départ
            </label>
            <input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className={inputClass(false)}
            />
          </div>

          {err && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {err}
            </p>
          )}
        </div>

        {/* Pied */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/60 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-lg px-3.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Création…
              </>
            ) : (
              <>
                <Plus size={14} />
                Créer le sac
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────
export default function BagsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('')
  const [showModal, setShowModal] = useState(false)

  const bags = useBags(filter ? { status: filter } : {})
  const createBag = useCreateBag()

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => agenciesApi.getAll(),
    select: (d) => (Array.isArray(d) ? d : d?.rows ?? []),
    enabled: showModal,
  })

  const data = bags.data ?? []
  const count = data.length

  const handleCreate = async (payload) => {
    await createBag.mutateAsync({
      ...payload,
      departureDate: payload.departureDate || undefined,
    })
    await showSuccessAlert({ text: 'Sac ajouté.' })
    setShowModal(false)
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-10">
      {/* En-tête */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Sacs
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            <span className="tabular-nums">{count}</span> sac
            {count > 1 ? 's' : ''}{' '}
            {filter ? 'correspondant au filtre' : 'au total'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex h-9 items-center gap-2 self-start rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 sm:self-auto"
        >
          <Plus size={14} />
          Nouveau sac
        </button>
      </header>

      {/* Filtres */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
        {FILTERS.map((f) => {
          const active = filter === f.value
          return (
            <button
              key={f.value || 'all'}
              type="button"
              onClick={() => setFilter(f.value)}
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

      {/* Grille */}
      {bags.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : count === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Package size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">
              {filter ? 'Aucun sac pour ce filtre' : 'Aucun sac enregistré'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {filter
                ? 'Modifiez le filtre pour élargir la recherche.'
                : 'Créez un nouveau sac pour démarrer le regroupement des colis.'}
            </p>
          </div>
          {filter ? (
            <button
              type="button"
              onClick={() => setFilter('')}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Réinitialiser le filtre
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="mt-1 inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <Plus size={14} />
              Nouveau sac
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((bag) => (
            <BagCard
              key={bag.id}
              bag={bag}
              onClick={() => navigate(`/bags/${bag.id}`)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <CreateBagModal
        open={showModal}
        onClose={() => setShowModal(false)}
        agencies={agencies}
        onCreate={handleCreate}
        isPending={createBag.isPending}
      />
    </div>
  )
}