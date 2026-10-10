import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  ChevronRight,
  Download,
  ReceiptText,
  Search,
  User,
  UserCheck,
} from 'lucide-react'
import { useDailyAccounting } from '../../hooks/useDailyAccounting'

const fmt = (value = 0) =>
  Number(value).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const STATUS_META = {
  paid: { label: 'Payée', dot: 'bg-emerald-500' },
  partially_paid: { label: 'Partielle', dot: 'bg-amber-500' },
  draft: { label: 'Impayée', dot: 'bg-slate-400' },
  overdue: { label: 'En retard', dot: 'bg-rose-500' },
}

const TABS = [
  { key: 'all', label: 'Toutes' },
  { key: 'paid', label: 'Payées' },
  { key: 'partially_paid', label: 'Partielles' },
  { key: 'draft', label: 'Impayées' },
]

function StatusDot({ status = 'draft' }) {
  const meta = STATUS_META[status] || STATUS_META.draft
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

function Stat({ label, value, unit = '€', helper, progress }) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">
        {value}
        {unit ? (
          <span className="ml-1 text-sm font-normal text-slate-400">{unit}</span>
        ) : null}
      </p>

      {progress !== undefined ? (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-500">{helper || '\u00A0'}</p>
      )}
    </div>
  )
}

export default function AccountingPage() {
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  )
  const [statusFilter, setStatusFilter] = useState('all')
  const [query, setQuery] = useState('')

  const { invoices, summary, isLoading } = useDailyAccounting(selectedDate)

  const totalAmount = Number(summary?.totalAmount || 0)
  const totalPaid = Number(summary?.totalPaid || 0)
  const totalRemaining = Number(summary?.totalRemaining || 0)
  const totalInvoices = Number(summary?.totalInvoices || 0)
  const totalSenderPaid = Number(summary?.totalSenderPaid || 0)
  const totalRecipientPaid = Number(summary?.totalRecipientPaid || 0)

  const collectionRate =
    totalAmount > 0 ? Math.min(100, Math.round((totalPaid / totalAmount) * 100)) : 0

  const tabCounts = {
    all: totalInvoices,
    paid: Number(summary?.paidCount || 0),
    partially_paid: Number(summary?.partialCount || 0),
    draft: Number(summary?.unpaidCount || 0),
  }

  const filteredInvoices = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (invoices || []).filter((invoice) => {
      const status = invoice.status || 'draft'
      if (statusFilter !== 'all' && status !== statusFilter) return false
      if (!q) return true
      return (
        String(invoice.number || '').toLowerCase().includes(q) ||
        String(invoice.parcel?.qrcode || '').toLowerCase().includes(q) ||
        String(invoice.id || '').toLowerCase().includes(q)
      )
    })
  }, [invoices, statusFilter, query])

  const totals = useMemo(
    () =>
      filteredInvoices.reduce(
        (acc, invoice) => {
          const total = Number(invoice.total || 0)
          const paid = Number(invoice.montantPaye || 0)
          acc.total += total
          acc.paid += paid
          acc.sender += Number(invoice.senderPaid || 0)
          acc.recipient += Number(invoice.recipientPaid || 0)
          acc.remaining += Math.max(0, total - paid)
          return acc
        },
        { total: 0, paid: 0, sender: 0, recipient: 0, remaining: 0 }
      ),
    [filteredInvoices]
  )

  const splitBase = totalSenderPaid + totalRecipientPaid || 1
  const senderShare = Math.round((totalSenderPaid / splitBase) * 100)
  const recipientShare = 100 - senderShare

  const statusRows = [
    { key: 'paid', label: 'Payées', count: tabCounts.paid, bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
    { key: 'partial', label: 'Partielles', count: tabCounts.partially_paid, bar: 'bg-amber-500', dot: 'bg-amber-500' },
    { key: 'draft', label: 'Impayées', count: tabCounts.draft, bar: 'bg-slate-400', dot: 'bg-slate-400' },
  ]

  const exportCsv = () => {
    const rows = [
      ['Facture', 'Colis', 'Statut', 'Total', 'Encaisse', 'Expediteur', 'Destinataire', 'Reste'],
      ...filteredInvoices.map((invoice) => {
        const total = Number(invoice.total || 0)
        const paid = Number(invoice.montantPaye || 0)
        return [
          invoice.number || `#${invoice.id}`,
          invoice.parcel?.qrcode || '',
          (STATUS_META[invoice.status || 'draft'] || STATUS_META.draft).label,
          total,
          paid,
          Number(invoice.senderPaid || 0),
          Number(invoice.recipientPaid || 0),
          Math.max(0, total - paid),
        ]
      }),
    ]

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n')

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `comptabilite-${selectedDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      {/* En-tête */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-500">
            <Link to="/invoices" className="transition hover:text-slate-700">
              Factures
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="font-medium text-slate-700">Comptabilité</span>
          </nav>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Comptabilité
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Suivi des encaissements et de la facturation journalière.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <CalendarDays
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-sm text-slate-700 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            <Download size={14} />
            Exporter
          </button>
        </div>
      </header>

      {/* Bandeau de statistiques */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 lg:grid-cols-4">
        <Stat
          label="Chiffre d'affaires"
          value={fmt(totalAmount)}
          helper={`${totalInvoices} facture${totalInvoices > 1 ? 's' : ''} sur la journée`}
        />
        <Stat
          label="Encaissé"
          value={fmt(totalPaid)}
          progress={collectionRate}
        />
        <Stat
          label="Reste à encaisser"
          value={fmt(totalRemaining)}
          helper={`${tabCounts.partially_paid + tabCounts.draft} facture${
            tabCounts.partially_paid + tabCounts.draft > 1 ? 's' : ''
          } en attente`}
        />
        <Stat
          label="Taux de recouvrement"
          value={collectionRate}
          unit="%"
          helper="Part du CA déjà réglée"
        />
      </div>

      {/* Contenu principal */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Tableau */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
              {TABS.map((tab) => {
                const active = statusFilter === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.label}
                    <span className="tabular-nums text-slate-400">
                      {tabCounts[tab.key]}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher une facture, un colis…"
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 lg:w-64"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3, 4].map((row) => (
                <div key={row} className="h-9 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <ReceiptText size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Aucune facture à afficher
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Modifiez la date ou réinitialisez les filtres pour élargir la recherche.
                </p>
              </div>
              {(statusFilter !== 'all' || query) && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all')
                    setQuery('')
                  }}
                  className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2.5 text-left font-medium">Facture</th>
                    <th className="px-4 py-2.5 text-left font-medium">Statut</th>
                    <th className="px-4 py-2.5 text-right font-medium">Total</th>
                    <th className="px-4 py-2.5 text-right font-medium">Encaissé</th>
                    <th className="px-4 py-2.5 text-right font-medium">Expéditeur</th>
                    <th className="px-4 py-2.5 text-right font-medium">Destinataire</th>
                    <th className="px-4 py-2.5 text-right font-medium">Reste</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredInvoices.map((invoice) => {
                    const total = Number(invoice.total || 0)
                    const paid = Number(invoice.montantPaye || 0)
                    const senderPaid = Number(invoice.senderPaid || 0)
                    const recipientPaid = Number(invoice.recipientPaid || 0)
                    const remaining = Math.max(0, total - paid)

                    return (
                      <tr
                        key={invoice.id}
                        className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {invoice.number || `#${invoice.id}`}
                          </div>
                          <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                            {invoice.parcel?.qrcode || 'Colis non lié'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusDot status={invoice.status} />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                          {fmt(total)} €
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">
                          {fmt(paid)} €
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                          {fmt(senderPaid)} €
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                          {fmt(recipientPaid)} €
                        </td>
                        <td
                          className={`px-4 py-3 text-right tabular-nums ${
                            remaining > 0
                              ? 'font-medium text-rose-600'
                              : 'text-slate-300'
                          }`}
                        >
                          {remaining > 0 ? `${fmt(remaining)} €` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>

                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                    <td className="px-4 py-3" colSpan={2}>
                      Total ({filteredInvoices.length})
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmt(totals.total)} €
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmt(totals.paid)} €
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                      {fmt(totals.sender)} €
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                      {fmt(totals.recipient)} €
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-rose-600">
                      {fmt(totals.remaining)} €
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* Panneau latéral */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-900">
                Origine des encaissements
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Répartition expéditeur / destinataire
              </p>
            </div>

            <div className="space-y-5 px-5 py-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <UserCheck size={14} className="text-slate-400" />
                    Expéditeurs
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-slate-900">
                    {fmt(totalSenderPaid)} €
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{ width: `${senderShare}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  {senderShare}% des encaissements
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <User size={14} className="text-slate-400" />
                    Destinataires
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-slate-900">
                    {fmt(totalRecipientPaid)} €
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${recipientShare}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  {recipientShare}% des encaissements
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-900">
                Statut des factures
              </h2>
            </div>

            <div className="space-y-4 px-5 py-4">
              {statusRows.map((row) => {
                const pct = totalInvoices > 0 ? Math.round((row.count / totalInvoices) * 100) : 0
                return (
                  <div key={row.key}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2 text-slate-600">
                        <span className={`h-1.5 w-1.5 rounded-full ${row.dot}`} />
                        {row.label}
                      </span>
                      <span className="font-medium tabular-nums text-slate-900">
                        {row.count}
                      </span>
                    </div>
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${row.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span>Total factures</span>
                <span className="font-semibold tabular-nums text-slate-900">
                  {totalInvoices}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}