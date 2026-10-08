import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Eye, Plus, Search, FileText, CheckCircle2, Clock,
  AlertTriangle, Filter, Loader2, Receipt, UserCheck, User, Users,
} from 'lucide-react'
import Card from '../../components/ui/Card'
import { useInvoices } from '../../hooks/useInvoices'

// ────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft:          { label: 'Brouillon',     color: 'bg-slate-100 text-slate-700 border-slate-200' },
  paid:           { label: 'Payé',          color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  partially_paid: { label: 'Partiellement', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  overdue:        { label: 'En retard',     color: 'bg-red-100 text-red-700 border-red-200' },
}

const STATUS_FILTERS = [
  { value: '',               label: 'Tous les statuts' },
  { value: 'draft',          label: 'Brouillon' },
  { value: 'paid',           label: 'Payé' },
  { value: 'partially_paid', label: 'Partiellement payé' },
  { value: 'overdue',        label: 'En retard' },
]

const PAYMENT_MODE_CONFIG = {
  sender_full:    { label: 'Expéditeur',   icon: UserCheck, color: 'text-violet-600 bg-violet-50 border-violet-100' },
  recipient_full: { label: 'Destinataire', icon: User,      color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  split:          { label: 'Partagé',       icon: Users,     color: 'text-amber-600 bg-amber-50 border-amber-100' },
}

const fmt = (n) =>
  Number(n || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })

// ────────────────────────────────────────────────────────────
// Badge statut
// ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

// ────────────────────────────────────────────────────────────
// Badge mode de paiement
// ────────────────────────────────────────────────────────────
function PaymentModeBadge({ mode }) {
  const cfg = PAYMENT_MODE_CONFIG[mode] || PAYMENT_MODE_CONFIG.recipient_full
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${cfg.color}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  )
}

// ────────────────────────────────────────────────────────────
// Mini barre paiement
// ────────────────────────────────────────────────────────────
function PaymentMiniBar({ paid, total }) {
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0
  const isFull = pct >= 100 && total > 0
  const color = isFull ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-slate-200'

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="font-semibold text-slate-800">
          {fmt(total)}
          <span className="text-[10px] font-normal text-slate-400 ml-1">EUR</span>
        </span>
      </div>
      {paid > 0 && paid < total && (
        <div className="flex items-center gap-1.5">
          <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-slate-400 tabular-nums">{Math.round(pct)}%</span>
        </div>
      )}
      {paid >= total && total > 0 && (
        <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
          <CheckCircle2 size={10} />
          Soldée
        </div>
      )}
      {paid > 0 && paid < total && (
        <div className="text-[10px] text-amber-600">
          Reste {fmt(total - paid)}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// KPI
// ────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, accent = 'slate', suffix }) {
  const accents = {
    violet:  'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber:   'bg-amber-50 text-amber-600',
    red:     'bg-red-50 text-red-600',
    slate:   'bg-slate-50 text-slate-500',
  }
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accents[accent]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-lg font-bold text-slate-800 truncate">
          {value}
          {suffix && <span className="text-xs font-normal text-slate-400 ml-1">{suffix}</span>}
        </p>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Skeleton
// ────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b last:border-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + i * 8}%` }} />
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
  const [statusFilter, setStatusFilter]           = useState('')
  const [paymentModeFilter, setPaymentModeFilter] = useState('')
  const [search, setSearch]                       = useState('')

  const { data: invoices = [], isLoading } = useInvoices(
    statusFilter ? { status: statusFilter } : {}
  )

  // ── Stats ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total     = invoices.length
    const paid      = invoices.filter(i => i.status === 'paid').length
    const pending   = invoices.filter(i => i.status === 'draft' || i.status === 'partially_paid').length
    const overdue   = invoices.filter(i => i.status === 'overdue').length
    const amountSum = invoices
      .filter(i => i.status === 'paid')
      .reduce((s, i) => s + Number(i.total || 0), 0)

    const encaisse = invoices.reduce(
      (s, i) => s + Number(i.montantPaye || 0), 0
    )

    return { total, paid, pending, overdue, amountSum, encaisse }
  }, [invoices])

  // ── Filtre local ─────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = invoices
    if (paymentModeFilter) {
      list = list.filter(i => i.paymentMode === paymentModeFilter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(i =>
        (i.number || '').toLowerCase().includes(q) ||
        (i.parcel?.qrcode || '').toLowerCase().includes(q) ||
        (i.parcel?.recipientName || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [invoices, search, paymentModeFilter])

  const hasFilters = Boolean(search || statusFilter || paymentModeFilter)

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Factures</h1>
          <p className="text-sm text-slate-500">
            {stats.total} facture{stats.total > 1 ? 's' : ''} au total
          </p>
        </div>
        <Link
          to="/invoices/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition self-start sm:self-auto"
        >
          <Plus size={16} />
          Créer une facture
        </Link>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={FileText}      label="Total"       value={stats.total}   accent="slate" />
        <KpiCard icon={CheckCircle2}  label="Payées"      value={stats.paid}    accent="emerald" />
        <KpiCard icon={Clock}         label="En attente"  value={stats.pending} accent="amber" />
        <KpiCard icon={AlertTriangle} label="En retard"   value={stats.overdue} accent="red" />
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par n°, colis ou destinataire…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
            />
          </div>

          <div className="relative sm:w-52">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition appearance-none"
            >
              {STATUS_FILTERS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="relative sm:w-52">
            <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={paymentModeFilter}
              onChange={e => setPaymentModeFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition appearance-none"
            >
              <option value="">Tous modes de paiement</option>
              <option value="sender_full">Expéditeur paie</option>
              <option value="recipient_full">Destinataire paie</option>
              <option value="split">Partagé</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tableau */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left  px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">N° facture</th>
                <th className="text-left  px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Colis</th>
                <th className="text-left  px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Client</th>
                <th className="text-left  px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Paiement</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Montant</th>
                <th className="text-left  px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

              {!isLoading && filtered.length === 0 && !hasFilters && (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <Receipt size={28} className="text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">Aucune facture pour le moment</p>
                      <p className="text-xs text-slate-400 mt-1">Créez votre première facture pour commencer.</p>
                      <Link
                        to="/invoices/new"
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition"
                      >
                        <Plus size={14} />
                        Créer une facture
                      </Link>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && filtered.length === 0 && hasFilters && (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <Search size={28} className="text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">Aucun résultat</p>
                      <p className="text-xs text-slate-400 mt-1">Essayez de modifier vos filtres ou votre recherche.</p>
                      <button
                        onClick={() => { setSearch(''); setStatusFilter(''); setPaymentModeFilter('') }}
                        className="mt-4 text-xs text-violet-600 font-semibold hover:underline"
                      >
                        Réinitialiser les filtres
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && filtered.map(inv => (
                <tr
                  key={inv.id}
                  className="border-b last:border-0 hover:bg-violet-50/30 transition cursor-pointer"
                  onClick={() => nav(`/invoices/${inv.id}`)}
                >
                  <td className="px-5 py-4">
                    <span className="font-mono text-sm font-medium text-violet-700">
                      #{inv.number}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs text-slate-600">
                      {inv.parcel?.qrcode ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell text-slate-700">
                    {inv.parcel?.sender?.name ?? '—'}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <PaymentModeBadge mode={inv.paymentMode} />
                  </td>
                  <td className="px-5 py-4 text-right min-w-[140px]">
                    <PaymentMiniBar
                      paid={Number(inv.montantPaye) || 0}
                      total={Number(inv.total) || 0}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); nav(`/invoices/${inv.id}`) }}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition"
                      title="Voir la facture"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 flex items-center justify-between">
            <span>
              {filtered.length} facture{filtered.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''}
              {hasFilters && stats.total !== filtered.length && ` sur ${stats.total}`}
            </span>
            {stats.encaisse > 0 && (
              <span className="font-medium text-emerald-600">
                Total encaissé : {fmt(stats.encaisse)} €
              </span>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}