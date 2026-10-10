import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Plus,
  Receipt,
  Search,
  User,
  UserCheck,
  Users,
} from 'lucide-react'
import { useInvoices } from '../../hooks/useInvoices'

// ────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────
const STATUS_META = {
  draft:          { label: 'Brouillon',     dot: 'bg-slate-400' },
  paid:           { label: 'Payée',         dot: 'bg-emerald-500' },
  partially_paid: { label: 'Partielle',     dot: 'bg-amber-500' },
  overdue:        { label: 'En retard',     dot: 'bg-rose-500' },
}

const STATUS_TABS = [
  { value: '',               label: 'Toutes' },
  { value: 'draft',          label: 'Brouillons' },
  { value: 'paid',           label: 'Payées' },
  { value: 'partially_paid', label: 'Partielles' },
  { value: 'overdue',        label: 'En retard' },
]

const PAYMENT_MODE_META = {
  sender_full:    { label: 'Expéditeur',   icon: UserCheck },
  recipient_full: { label: 'Destinataire', icon: User },
  split:          { label: 'Partagé',      icon: Users },
}

const fmt = (n) =>
  Number(n || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

// ────────────────────────────────────────────────────────────
// StatusDot
// ────────────────────────────────────────────────────────────
function StatusDot({ status = 'draft' }) {
  const meta = STATUS_META[status] || STATUS_META.draft
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

// ────────────────────────────────────────────────────────────
// PaymentModeCell
// ────────────────────────────────────────────────────────────
function PaymentModeCell({ mode }) {
  const meta = PAYMENT_MODE_META[mode] || PAYMENT_MODE_META.recipient_full
  const Icon = meta.icon
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <Icon size={12} className="text-slate-400" />
      {meta.label}
    </span>
  )
}

// ────────────────────────────────────────────────────────────
// PaymentProgress
// ────────────────────────────────────────────────────────────
function PaymentProgress({ paid, total }) {
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0
  const isFull = pct >= 100 && total > 0
  const isPartial = paid > 0 && paid < total
  const bar = isFull ? 'bg-emerald-500' : isPartial ? 'bg-amber-500' : 'bg-slate-300'

  return (
    <div className="min-w-[140px]">
      <div className="flex items-baseline justify-end gap-1 tabular-nums">
        <span className="text-sm font-medium text-slate-900">{fmt(total)}</span>
        <span className="text-[10px] font-normal text-slate-400">€</span>
      </div>

      {total > 0 && (
        <div className="mt-1.5 flex items-center justify-end gap-1.5">
          {isFull ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
              <CheckCircle2 size={10} />
              Soldée
            </span>
          ) : (
            <>
              <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 text-right text-[10px] tabular-nums text-slate-400">
                {Math.round(pct)}%
              </span>
            </>
          )}
        </div>
      )}

      {isPartial && (
        <p className="mt-0.5 text-right text-[10px] text-amber-600 tabular-nums">
          Reste {fmt(total - paid)} €
        </p>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Stat
// ────────────────────────────────────────────────────────────
function Stat({ icon: Icon, label, value, helper }) {
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
          {value}
        </p>
        {helper ? (
          <p className="mt-0.5 text-xs text-slate-500">{helper}</p>
        ) : null}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Skeleton
// ────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div
            className="h-3 animate-pulse rounded bg-slate-100"
            style={{ width: `${55 + i * 6}%` }}
          />
        </td>
      ))}
    </tr>
  )
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const nav = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentModeFilter, setPaymentModeFilter] = useState('')
  const [search, setSearch] = useState('')

  const { data: invoices = [], isLoading } = useInvoices(
    statusFilter ? { status: statusFilter } : {}
  )

  // ── Stats globales ────────────────────────────────────────
  const stats = useMemo(() => {
    const total = invoices.length
    const paid = invoices.filter((i) => i.status === 'paid').length
    const pending = invoices.filter(
      (i) => i.status === 'draft' || i.status === 'partially_paid'
    ).length
    const overdue = invoices.filter((i) => i.status === 'overdue').length

    const encaisse = invoices.reduce(
      (s, i) => s + Number(i.montantPaye || 0),
      0
    )
    const facture = invoices.reduce(
      (s, i) => s + Number(i.total || 0),
      0
    )
    const reste = Math.max(0, facture - encaisse)

    return { total, paid, pending, overdue, encaisse, facture, reste }
  }, [invoices])

  // ── Filtre local ─────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = invoices
    if (paymentModeFilter) {
      list = list.filter((i) => i.paymentMode === paymentModeFilter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (i) =>
          (i.number || '').toLowerCase().includes(q) ||
          (i.parcel?.qrcode || '').toLowerCase().includes(q) ||
          (i.parcel?.recipientName || '').toLowerCase().includes(q) ||
          (i.parcel?.sender?.name || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [invoices, search, paymentModeFilter])

  const hasFilters = Boolean(search || statusFilter || paymentModeFilter)

  // Compteurs pour les onglets (dérivés des données locales)
  const tabCounts = useMemo(() => {
    const base = { all: invoices.length, draft: 0, paid: 0, partially_paid: 0, overdue: 0 }
    for (const i of invoices) {
      const s = i.status || 'draft'
      if (s in base) base[s] += 1
    }
    return base
  }, [invoices])

  // ── Export CSV ───────────────────────────────────────────
  const exportCsv = () => {
    const rows = [
      ['N° facture', 'Colis', 'Client', 'Mode de paiement', 'Total', 'Encaissé', 'Statut'],
      ...filtered.map((inv) => [
        inv.number || '',
        inv.parcel?.qrcode || '',
        inv.parcel?.sender?.name || '',
        (PAYMENT_MODE_META[inv.paymentMode] || {}).label || '',
        Number(inv.total || 0),
        Number(inv.montantPaye || 0),
        (STATUS_META[inv.status] || STATUS_META.draft).label,
      ]),
    ]

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')
      )
      .join('\n')

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `factures-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('')
    setPaymentModeFilter('')
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      {/* En-tête */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Factures
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {stats.total} facture{stats.total > 1 ? 's' : ''} enregistrée
            {stats.total > 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            <Download size={14} />
            Exporter
          </button>

          <Link
            to="/invoices/new"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            <Plus size={14} />
            Nouvelle facture
          </Link>
        </div>
      </header>

      {/* Bandeau de statistiques */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 lg:grid-cols-4">
        <Stat
          icon={CheckCircle2}
          label="Encaissé"
          value={`${fmt(stats.encaisse)} €`}
          helper={`sur ${fmt(stats.facture)} € facturés`}
        />
        <Stat
          icon={Clock}
          label="En attente"
          value={stats.pending}
          helper={`${stats.paid} facture${stats.paid > 1 ? 's' : ''} réglée${stats.paid > 1 ? 's' : ''}`}
        />
        <Stat
          icon={Clock}
          label="En retard"
          value={stats.overdue}
          helper={stats.overdue > 0 ? 'Action requise' : 'Aucun retard'}
        />
        <Stat
          icon={Eye}
          label="Reste à encaisser"
          value={`${fmt(stats.reste)} €`}
          helper={`${stats.total} facture${stats.total > 1 ? 's' : ''} au total`}
        />
      </div>

      {/* Tableau + toolbar */}
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
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                  <span className="tabular-nums text-slate-400">
                    {tabCounts[tab.value || 'all'] ?? 0}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="N°, colis, client…"
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 sm:w-56"
              />
            </div>

            <div className="relative">
              <Users
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={paymentModeFilter}
                onChange={(e) => setPaymentModeFilter(e.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-8 pr-8 text-sm text-slate-700 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 sm:w-48"
              >
                <option value="">Tous modes</option>
                <option value="sender_full">Expéditeur</option>
                <option value="recipient_full">Destinataire</option>
                <option value="split">Partagé</option>
              </select>
              <svg
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
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

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5 text-left font-medium">N° facture</th>
                <th className="px-4 py-2.5 text-left font-medium">Colis</th>
                <th className="hidden px-4 py-2.5 text-left font-medium md:table-cell">
                  Client
                </th>
                <th className="hidden px-4 py-2.5 text-left font-medium lg:table-cell">
                  Paiement
                </th>
                <th className="px-4 py-2.5 text-right font-medium">Montant</th>
                <th className="px-4 py-2.5 text-left font-medium">Statut</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

              {!isLoading && filtered.length === 0 && !hasFilters && (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Receipt size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          Aucune facture pour le moment
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Créez votre première facture pour démarrer le suivi.
                        </p>
                      </div>
                      <Link
                        to="/invoices/new"
                        className="mt-1 inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-white transition hover:bg-slate-800"
                      >
                        <Plus size={14} />
                        Nouvelle facture
                      </Link>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && filtered.length === 0 && hasFilters && (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Search size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          Aucun résultat
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Aucune facture ne correspond à ces critères.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Réinitialiser les filtres
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading &&
                filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => nav(`/invoices/${inv.id}`)}
                    className="cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-sm font-medium text-slate-900">
                        #{inv.number}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs text-slate-500">
                        {inv.parcel?.qrcode ?? '—'}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3.5 text-slate-700 md:table-cell">
                      {inv.parcel?.sender?.name ?? '—'}
                    </td>
                    <td className="hidden px-4 py-3.5 lg:table-cell">
                      <PaymentModeCell mode={inv.paymentMode} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <PaymentProgress
                        paid={Number(inv.montantPaye) || 0}
                        total={Number(inv.total) || 0}
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusDot status={inv.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          nav(`/invoices/${inv.id}`)
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        title="Voir la facture"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pied de tableau */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-500">
            <span>
              {filtered.length} facture{filtered.length > 1 ? 's' : ''} affichée
              {filtered.length > 1 ? 's' : ''}
              {hasFilters && stats.total !== filtered.length && ` sur ${stats.total}`}
            </span>
            <span className="font-medium tabular-nums text-slate-700">
              Total encaissé :{' '}
              <span className="text-emerald-600">{fmt(stats.encaisse)} €</span>
            </span>
          </div>
        )}
      </section>
    </div>
  )
}