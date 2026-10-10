// src/pages/notifications/NotificationsPage.jsx
import { useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Bell,
  ChevronRight,
  Mail,
  MessageSquare,
  Search,
  X,
} from 'lucide-react'
import {
  useNotifications,
  useNotificationStats,
} from '../../hooks/useNotifications'

// ────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────
const STATUS_META = {
  sent:    { label: 'Envoyée',    dot: 'bg-emerald-500' },
  pending: { label: 'En attente', dot: 'bg-amber-500' },
  failed:  { label: 'Échouée',    dot: 'bg-rose-500' },
}

const CHANNEL_META = {
  email: { label: 'Email', icon: Mail },
  sms:   { label: 'SMS',   icon: MessageSquare },
}

const TYPE_META = {
  status_update: { label: 'Suivi',   tone: 'text-slate-600' },
  issue:         { label: 'Alerte',  tone: 'text-rose-600' },
  bulk_alert:    { label: 'Groupé',  tone: 'text-slate-600' },
}

const STATUS_TABS = [
  { label: 'Toutes',     value: '' },
  { label: 'Envoyées',   value: 'sent' },
  { label: 'En attente', value: 'pending' },
  { label: 'Échouées',   value: 'failed' },
]

const CHANNEL_TABS = [
  { label: 'Tous',  value: '' },
  { label: 'Email', value: 'email' },
  { label: 'SMS',   value: 'sms' },
]

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ────────────────────────────────────────────────────────────
// Primitives
// ────────────────────────────────────────────────────────────
function StatusDot({ status = 'pending' }) {
  const meta = STATUS_META[status] || STATUS_META.pending
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

function ChannelLabel({ channel }) {
  const meta = CHANNEL_META[channel]
  if (!meta) return <span className="text-xs text-slate-400">—</span>
  const Icon = meta.icon
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <Icon size={12} className="text-slate-400" />
      {meta.label}
    </span>
  )
}

function TypeLabel({ type }) {
  const meta = TYPE_META[type] || TYPE_META.status_update
  return (
    <span className={`text-xs font-medium ${meta.tone}`}>{meta.label}</span>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 bg-white px-5 py-4">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
          {value ?? '—'}
        </p>
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div
            className="h-3 animate-pulse rounded bg-slate-100"
            style={{ width: `${55 + i * 8}%` }}
          />
        </td>
      ))}
    </tr>
  )
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState('desc')
  const [expandedId, setExpandedId] = useState(null)

  const notifs = useNotifications({
    status: statusFilter || undefined,
    channel: channelFilter || undefined,
    search: search || undefined,
    sort: sortOrder,
  })
  const stats = useNotificationStats()

  const data = notifs.data ?? []
  const s = stats.data ?? {}

  const hasFilters = Boolean(search || statusFilter || channelFilter)

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('')
    setChannelFilter('')
  }

  const toggleSort = () =>
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))

  const toggleRow = (id) =>
    setExpandedId((prev) => (prev === id ? null : id))

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-10">
      {/* En-tête */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Historique des emails et SMS envoyés aux clients.
        </p>
      </header>

      {/* Bandeau de stats */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 lg:grid-cols-4">
        <Stat icon={Bell}          label="Total"      value={s.total} />
        <Stat icon={Mail}          label="Envoyées"   value={s.sent} />
        <Stat icon={MessageSquare} label="En attente" value={s.pending} />
        <Stat icon={Bell}          label="Échouées"   value={s.failed} />
      </div>

      {/* Section liste + toolbar */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.value
              return (
                <button
                  key={tab.value || 'all'}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Canal */}
            <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
              {CHANNEL_TABS.map((tab) => {
                const active = channelFilter === tab.value
                return (
                  <button
                    key={tab.value || 'all-channels'}
                    type="button"
                    onClick={() => setChannelFilter(tab.value)}
                    className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                      active
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Recherche */}
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Code colis, email, téléphone…"
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-8 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 sm:w-64"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Effacer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Tri */}
            <button
              type="button"
              onClick={toggleSort}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              title={sortOrder === 'desc' ? 'Plus récent' : 'Plus ancien'}
            >
              {sortOrder === 'desc' ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
              <span className="hidden sm:inline">
                {sortOrder === 'desc' ? 'Plus récent' : 'Plus ancien'}
              </span>
            </button>

            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="h-9 rounded-lg px-3 text-xs font-medium text-slate-500 transition hover:text-slate-800"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Chargement */}
        {notifs.isLoading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* État vide */}
        {!notifs.isLoading && data.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              {hasFilters ? <Search size={18} /> : <Bell size={18} />}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                {hasFilters
                  ? 'Aucune notification ne correspond à ces critères'
                  : 'Aucune notification'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {hasFilters
                  ? 'Modifiez les filtres ou la recherche pour élargir les résultats.'
                  : "Les notifications envoyées apparaîtront ici."}
              </p>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}

        {/* Vue mobile */}
        {!notifs.isLoading && data.length > 0 && (
          <div className="divide-y divide-slate-100 md:hidden">
            {data.map((n) => {
              const expanded = expandedId === n.id
              return (
                <div key={n.id} className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleRow(n.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-medium text-slate-900">
                        {n.parcel?.qrcode ?? '—'}
                      </span>
                      <StatusDot status={n.status} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <ChannelLabel channel={n.channel} />
                      <span className="text-slate-300">·</span>
                      <TypeLabel type={n.type} />
                      <span className="text-slate-300">·</span>
                      <span className="truncate text-xs text-slate-500">
                        {n.recipientEmail ?? n.recipientPhone ?? '—'}
                      </span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="mt-3 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Date</span>
                        <span className="tabular-nums text-slate-700">
                          {formatDate(n.sentAt ?? n.createdAt)}
                        </span>
                      </div>
                      {n.errorMessage && (
                        <div className="flex items-start justify-between gap-3 border-t border-slate-200 pt-1.5">
                          <span className="text-rose-600">Erreur</span>
                          <span className="text-right text-rose-600">
                            {n.errorMessage}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Vue desktop */}
        {!notifs.isLoading && data.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5 text-left font-medium">Colis</th>
                  <th className="px-4 py-2.5 text-left font-medium">Destinataire</th>
                  <th className="px-4 py-2.5 text-left font-medium">Canal</th>
                  <th className="px-4 py-2.5 text-left font-medium">Type</th>
                  <th className="px-4 py-2.5 text-left font-medium">Statut</th>
                  <th className="px-4 py-2.5 text-left font-medium">Date</th>
                  <th className="w-10 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {data.map((n) => {
                  const expanded = expandedId === n.id
                  return (
                    <>
                      <tr
                        key={n.id}
                        onClick={() => toggleRow(n.id)}
                        className={`cursor-pointer border-b transition ${
                          expanded
                            ? 'border-slate-100 bg-slate-50/60'
                            : 'border-slate-100 hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-sm font-medium text-slate-900">
                            {n.parcel?.qrcode ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">
                          {n.recipientEmail ?? n.recipientPhone ?? '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <ChannelLabel channel={n.channel} />
                        </td>
                        <td className="px-4 py-3.5">
                          <TypeLabel type={n.type} />
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusDot status={n.status} />
                        </td>
                        <td className="px-4 py-3.5 text-xs tabular-nums text-slate-500">
                          {formatDate(n.sentAt ?? n.createdAt)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <ChevronRight
                            size={14}
                            className={`text-slate-400 transition-transform ${
                              expanded ? 'rotate-90' : ''
                            }`}
                          />
                        </td>
                      </tr>
                      {expanded && (
                        <tr key={`${n.id}-detail`} className="border-b border-slate-100">
                          <td colSpan={7} className="bg-slate-50/60 px-4 py-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                                  Date d'envoi
                                </p>
                                <p className="mt-0.5 text-xs tabular-nums text-slate-700">
                                  {formatDate(n.sentAt ?? n.createdAt)}
                                </p>
                              </div>
                              {n.errorMessage && (
                                <div>
                                  <p className="text-[10px] font-medium uppercase tracking-wider text-rose-400">
                                    Erreur
                                  </p>
                                  <p className="mt-0.5 text-xs text-rose-600">
                                    {n.errorMessage}
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pied */}
        {!notifs.isLoading && data.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-500">
            <span className="tabular-nums">{data.length}</span> notification
            {data.length > 1 ? 's' : ''} affichée
            {data.length > 1 ? 's' : ''}
            {hasFilters ? ' (filtrées)' : ''}
          </div>
        )}
      </section>
    </div>
  )
}