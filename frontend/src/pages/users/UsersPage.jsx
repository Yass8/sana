// src/pages/users/UsersPage.jsx
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Plus,
  Search,
  X,
} from 'lucide-react'
import {
  useUsers,
  useDesactivateUser,
  useSendBulkMessage,
} from '../../hooks/useUsers'
import Spinner from '../../components/ui/Spinner'
import {
  confirmDeleteAlert,
  showErrorAlert,
  showSuccessAlert,
} from '../../components/ui/SweetsAlert'
import UsersList from '../../components/users/UsersList'
import BulkMessageModal from '../../components/users/BulkMessageModal'

// ────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────
const ROLE_FILTERS = [
  { label: 'Tous',      value: '' },
  { label: 'Clients',   value: 'client' },
  { label: 'Agents FR', value: 'agent_fr' },
  { label: 'Agents AF', value: 'agent_af' },
  { label: 'Admins',    value: 'admin' },
]

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200]

// ────────────────────────────────────────────────────────────
// Pagination — compacte, style Linear/Notion
// ────────────────────────────────────────────────────────────
function Pagination({
  page,
  pageSize,
  totalCount,
  isLoading,
  onPageChange,
  onPageSizeChange,
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)

  const [draft, setDraft] = useState(String(safePage))

  // Sync input quand la page change (via boutons, reset, etc.)
  useEffect(() => {
    setDraft(String(safePage))
  }, [safePage])

  const commitDraft = () => {
    const n = parseInt(draft, 10)
    if (Number.isNaN(n)) {
      setDraft(String(safePage))
      return
    }
    const clamped = Math.min(Math.max(1, n), totalPages)
    if (clamped !== safePage) onPageChange(clamped)
    else setDraft(String(clamped))
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
    if (e.key === 'Escape') {
      setDraft(String(safePage))
      e.currentTarget.blur()
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-500">
      {/* Navigation */}
      <button
        type="button"
        onClick={() => onPageChange(safePage - 1)}
        disabled={safePage <= 1 || isLoading}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Page précédente"
      >
        <ChevronLeft size={14} />
      </button>

      <span className="hidden select-none sm:inline">Page</span>

      <input
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
        onBlur={commitDraft}
        onKeyDown={onKeyDown}
        disabled={isLoading}
        aria-label="Numéro de page"
        className="h-8 w-12 rounded-lg border border-slate-300 bg-white text-center text-xs tabular-nums text-slate-800 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:opacity-60"
      />

      <span className="select-none tabular-nums">
        sur {totalPages}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(safePage + 1)}
        disabled={safePage >= totalPages || isLoading}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Page suivante"
      >
        <ChevronRight size={14} />
      </button>

      {/* Sélecteur rows */}
      <div className="relative ml-1">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          disabled={isLoading}
          aria-label="Lignes par page"
          className="h-8 appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-7 text-xs tabular-nums text-slate-700 transition hover:bg-slate-50 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:opacity-60"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} lignes
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {/* Compteur records */}
      <span className="ml-auto select-none tabular-nums text-slate-500">
        {isLoading ? (
          <span className="text-slate-400">Chargement…</span>
        ) : (
          <>
            <span className="font-medium text-slate-700">{totalCount}</span>{' '}
            enregistrement{totalCount > 1 ? 's' : ''}
          </>
        )}
      </span>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('') // '' = tous
  const [selected, setSelected] = useState(new Set())
  const [showModal, setShowModal] = useState(false)
  const [toasted, setToasted] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const isClientView = roleFilter === 'client'

  const users = useUsers({
    role: roleFilter || undefined,
    search: search || undefined,
    page,
    limit: pageSize,
  })
  const desactivate = useDesactivateUser()
  const sendBulk = useSendBulkMessage()

  // ── Extraction de la donnée (défensif : supporte tableau ou { rows, count }) ──
  const data = users.data?.rows ?? []
  const totalCount = users.data?.count ?? 0

  // Reset page quand les filtres changent
  useEffect(() => {
    setPage(1)
  }, [search, roleFilter])

  // Si on dépasse la dernière page après un changement de taille, on revient
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    if (page > totalPages) setPage(totalPages)
  }, [page, pageSize, totalCount])

  // ── Sélection ─────────────────────────────────────────────
  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleAll = (checked) =>
    setSelected(checked ? new Set(data.map((u) => u.id)) : new Set())

  // ── Suppression ───────────────────────────────────────────
  const handleDelete = async (id, name) => {
    const confirmed = await confirmDeleteAlert({
      message: `Supprimer ${name} ?`,
    })
    if (!confirmed) return
    try {
      await desactivate.mutateAsync(id)
      showSuccessAlert({ text: 'Utilisateur désactivé.' })
    } catch (err) {
      showErrorAlert({ text: err?.message || 'Erreur' })
    }
  }

  // ── Envoi groupé ──────────────────────────────────────────
  const handleBulkSent = () => {
    setShowModal(false)
    setSelected(new Set())
    setToasted(true)
    setTimeout(() => setToasted(false), 3000)
  }

  const hasFilters = Boolean(search || roleFilter)
  const selectedCount = selected.size

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-10">
      {/* En-tête */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Utilisateurs
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            <span className="tabular-nums">{totalCount}</span> utilisateur
            {totalCount > 1 ? 's' : ''}{' '}
            {hasFilters ? 'correspondant aux filtres' : 'au total'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isClientView && selectedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              <MessageSquare size={14} />
              Message groupé
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[10px] font-semibold tabular-nums text-white">
                {selectedCount}
              </span>
            </button>
          )}

          <Link
            to="/users/new"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            <Plus size={14} />
            Nouvel utilisateur
          </Link>
        </div>
      </header>

      {/* Toast succès */}
      {toasted && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            ✓
          </span>
          Message envoyé aux clients sélectionnés.
        </div>
      )}

      {/* Section liste + toolbar */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
            {ROLE_FILTERS.map((f) => {
              const active = roleFilter === f.value
              return (
                <button
                  key={f.value || 'all'}
                  type="button"
                  onClick={() => {
                    setRoleFilter(f.value)
                    setSelected(new Set())
                  }}
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, email…"
              className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-8 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Effacer la recherche"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Bandeau de sélection */}
        {isClientView && selectedCount > 0 && (
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-2 text-xs">
            <span className="font-medium text-slate-700">
              <span className="tabular-nums">{selectedCount}</span> client
              {selectedCount > 1 ? 's' : ''} sélectionné
              {selectedCount > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="font-medium text-slate-500 transition hover:text-slate-800"
            >
              Effacer la sélection
            </button>
          </div>
        )}

                {/* Liste / chargement */}
        {users.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <div
            className={`transition-opacity duration-150 ${
              users.isFetching ? 'opacity-50' : 'opacity-100'
            }`}
          >
            <UsersList
              data={data}
              roleFilter={roleFilter}
              selected={selected}
              onToggleOne={toggleOne}
              onToggleAll={toggleAll}
              onDelete={handleDelete}
            />
          </div>
        )}

        {/* Pagination */}
        {!users.isLoading && (
          <Pagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            isLoading={users.isFetching}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n)
              setPage(1)
            }}
          />
        )}
      </section>

      {/* Modal envoi groupé */}
      {showModal && (
        <BulkMessageModal
          selected={selected}
          sendBulk={sendBulk}
          onClose={handleBulkSent}
        />
      )}
    </div>
  )
}