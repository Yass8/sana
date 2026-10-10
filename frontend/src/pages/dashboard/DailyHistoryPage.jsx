// src/pages/history/DailyHistoryPage.jsx
import { useState, useMemo } from 'react'
import { CalendarDays, Download, Package, Search, Scale, Wallet } from 'lucide-react'
import { useDailyParcels } from '../../hooks/useDailyParcels'
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
const fmtKg = (n) =>
  Number(n || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const fmtMoney = (n) =>
  Number(n || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

// ────────────────────────────────────────────────────────────
// Stat
// ────────────────────────────────────────────────────────────
function Stat({ icon: Icon, label, value, unit, helper }) {
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
          {unit ? (
            <span className="ml-1 text-sm font-normal text-slate-400">{unit}</span>
          ) : null}
        </p>
        {helper ? <p className="mt-0.5 text-xs text-slate-500">{helper}</p> : null}
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
      {Array.from({ length: 4 }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div
            className="h-3 animate-pulse rounded bg-slate-100"
            style={{ width: `${55 + i * 10}%` }}
          />
        </td>
      ))}
    </tr>
  )
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────
export default function DailyHistoryPage() {
  const todayStr = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [pricePerKg, setPricePerKg] = useState(17)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: parcels = [], isLoading, error } = useDailyParcels(selectedDate)

  // ── Filtrage ──────────────────────────────────────────────
  const filteredParcels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return parcels
    return parcels.filter((p) => {
      const code = (p.qrcode || '').toLowerCase()
      const sender = (p.sender?.name || '').toLowerCase()
      return code.includes(q) || sender.includes(q)
    })
  }, [parcels, searchQuery])

  // ── Totaux ────────────────────────────────────────────────
  const { totalWeight, totalPrice, avgWeight } = useMemo(() => {
    let weight = 0
    for (const p of parcels) {
      weight += parseFloat(p.weight) || 0
    }
    const count = parcels.length || 0
    return {
      totalWeight: weight,
      totalPrice: weight * pricePerKg,
      avgWeight: count > 0 ? weight / count : 0,
    }
  }, [parcels, pricePerKg])

  // ── Date lisible ──────────────────────────────────────────
  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString(
    'fr-FR',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  )

  // ────────────────────────────────────────────────────────────
  // PDF (logique inchangée)
  // ────────────────────────────────────────────────────────────
  const handleDownloadPdf = () => {
    const pdfDateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString(
      'fr-FR',
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    )

    const header = {
      columns: [
        {
          width: '*',
          stack: [
            { text: 'SanaService', style: 'companyName' },
            {
              text: 'Rapport journalier – Historique des colis expédiés',
              style: 'reportSubtitle',
            },
          ],
        },
        { text: pdfDateLabel, style: 'headerDate', alignment: 'right' },
      ],
      margin: [40, 10, 40, 20],
    }

    const totalsBlock = {
      columns: [
        {
          width: '50%',
          margin: [0, 0, 5, 0],
          table: {
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    { text: `${totalWeight.toFixed(2)} kg`, style: 'totalNumber' },
                    { text: 'Total kilos', style: 'totalLabel' },
                  ],
                  margin: [10, 10, 10, 10],
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 0,
            hLineColor: () => '#E2E8F0',
            paddingLeft: () => 0,
            paddingRight: () => 0,
          },
        },
        {
          width: '50%',
          margin: [5, 0, 0, 0],
          table: {
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    { text: `${totalPrice.toFixed(2)} €`, style: 'totalNumberPrice' },
                    { text: 'Total prix', style: 'totalLabel' },
                  ],
                  margin: [10, 10, 10, 10],
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 0,
            hLineColor: () => '#E2E8F0',
            paddingLeft: () => 0,
            paddingRight: () => 0,
          },
        },
      ],
      margin: [0, 0, 0, 20],
    }

    const pricePerKgBlock = {
      text: `Prix au kilo : ${pricePerKg} €`,
      style: 'footnote',
      margin: [0, 0, 0, 10],
    }

    const tableHeaderStyle = {
      fontSize: 9,
      bold: true,
      color: '#475569',
      fillColor: '#F1F5F9',
      margin: [0, 4, 0, 4],
    }

    const tableBody = [
      [
        { text: 'Code', style: 'tableHeader' },
        { text: 'Client', style: 'tableHeader' },
        { text: 'Kilos', style: 'tableHeader', alignment: 'center' },
        { text: 'Prix total', style: 'tableHeader', alignment: 'right' },
      ],
    ]

    parcels.forEach((p, index) => {
      const weight = parseFloat(p.weight) || 0
      const price = (weight * pricePerKg).toFixed(2)
      const rowFill = index % 2 === 0 ? null : '#F8FAFC'

      tableBody.push([
        { text: p.qrcode, style: 'qrCode', fillColor: rowFill },
        { text: p.sender?.name || '—', fillColor: rowFill },
        { text: `${weight} kg`, alignment: 'center', fillColor: rowFill },
        { text: `${price} €`, alignment: 'right', fillColor: rowFill },
      ])
    })

    tableBody.push([
      {
        text: 'TOTAL',
        bold: true,
        colSpan: 2,
        alignment: 'left',
        fillColor: '#F1F5F9',
      },
      {},
      {
        text: `${totalWeight.toFixed(2)} kg`,
        bold: true,
        alignment: 'center',
        fillColor: '#F1F5F9',
      },
      {
        text: `${totalPrice.toFixed(2)} €`,
        bold: true,
        alignment: 'right',
        fillColor: '#F1F5F9',
      },
    ])

    const dataTable = {
      table: {
        headerRows: 1,
        widths: ['auto', '*', 'auto', 'auto'],
        body: tableBody,
      },
      layout: {
        hLineWidth: (i, node) =>
          i === 0 || i === node.table.body.length ? 0 : 0.5,
        vLineWidth: () => 0,
        hLineColor: () => '#CBD5E1',
        paddingTop: () => 8,
        paddingBottom: () => 8,
        paddingLeft: (i) => (i === 0 ? 10 : 5),
        paddingRight: (i, node) =>
          i === node.table.widths.length - 1 ? 10 : 5,
      },
      margin: [0, 0, 0, 10],
    }

    const footer = (currentPage, pageCount) => ({
      text: `Page ${currentPage} / ${pageCount}`,
      alignment: 'center',
      fontSize: 8,
      color: '#94A3B8',
      margin: [0, 20, 0, 0],
    })

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 50],
      header: () => header,
      footer,
      content: [
        totalsBlock,
        {
          text: `Colis de la journée (${parcels.length || 0})`,
          style: 'sectionTitle',
          margin: [0, 0, 0, 8],
        },
        pricePerKgBlock,
        dataTable,
        {
          text: 'Rapport généré automatiquement – Les données sont basées sur les enregistrements du jour.',
          style: 'footnote',
          margin: [0, 15, 0, 0],
        },
      ],
      styles: {
        companyName: {
          fontSize: 16,
          bold: true,
          color: '#0F172A',
          letterSpacing: 1.5,
        },
        reportSubtitle: { fontSize: 8.5, color: '#64748B', margin: [0, 2, 0, 0] },
        headerDate: { fontSize: 10, color: '#475569', alignment: 'right' },
        totalNumber: { fontSize: 22, bold: true, color: '#0F172A' },
        totalNumberPrice: { fontSize: 22, bold: true, color: '#7C3AED' },
        totalLabel: { fontSize: 9, color: '#64748B', margin: [0, 4, 0, 0] },
        sectionTitle: { fontSize: 12, bold: true, color: '#0F172A' },
        tableHeader: tableHeaderStyle,
        qrCode: { color: '#7C3AED', bold: true, fontSize: 9 },
        footnote: { fontSize: 7.5, color: '#94A3B8', italics: true },
      },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 9.5,
        lineHeight: 1.3,
        color: '#334155',
      },
    }

    pdfMake.createPdf(docDefinition).download(
      `historique-SanaService-${selectedDate}.pdf`
    )
  }

  const hasSearch = searchQuery.trim().length > 0
  const parcelCount = parcels.length

  // ────────────────────────────────────────────────────────────
  // Rendu
  // ────────────────────────────────────────────────────────────
  return (
    <div id="daily-history-print" className="mx-auto max-w-7xl space-y-6 pb-10">
      {/* En-tête */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Historique des colis
          </h1>
          <p className="mt-1 text-sm capitalize text-slate-500">{dateLabel}</p>
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
              max={todayStr}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-sm text-slate-700 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={parcelCount === 0}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={14} />
            Exporter PDF
          </button>
        </div>
      </header>

      {/* Bandeau de statistiques */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 lg:grid-cols-4">
        <Stat
          icon={Package}
          label="Colis"
          value={parcelCount}
          helper={hasSearch ? `${filteredParcels.length} affiché(s)` : 'Total du jour'}
        />
        <Stat
          icon={Scale}
          label="Poids total"
          value={fmtKg(totalWeight)}
          unit="kg"
          helper={`Moyenne ${fmtKg(avgWeight)} kg/colis`}
        />
        <Stat
          icon={Wallet}
          label="Prix au kilo"
          value={fmtMoney(pricePerKg)}
          unit="€"
          helper="Tarif appliqué"
        />
        <Stat
          icon={Wallet}
          label="Chiffre du jour"
          value={fmtMoney(totalPrice)}
          unit="€"
          helper={`${parcelCount} colis × tarif`}
        />
      </div>

      {/* Tableau + toolbar */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Tarif
            </span>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(parseFloat(e.target.value) || 0)}
                className="h-9 w-24 rounded-lg border border-slate-300 bg-white px-3 pr-7 text-sm tabular-nums text-slate-700 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                €
              </span>
            </div>
            <span className="hidden text-xs text-slate-400 sm:inline">/ kg</span>
          </div>

          <div className="relative lg:w-64">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Code colis ou client…"
              className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* En-tête de section */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {hasSearch
              ? `Résultats (${filteredParcels.length} / ${parcelCount})`
              : 'Détail des colis'}
          </h2>
          {hasSearch && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-medium text-slate-500 transition hover:text-slate-800"
            >
              Effacer la recherche
            </button>
          )}
        </div>

        {/* États vides */}
        {isLoading && (
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

        {error && !isLoading && (
          <div className="px-6 py-16 text-center text-sm text-rose-600">
            Erreur lors du chargement des colis.
          </div>
        )}

        {!isLoading && !error && filteredParcels.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Package size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                {hasSearch
                  ? 'Aucun colis ne correspond à votre recherche'
                  : 'Aucun colis enregistré ce jour'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {hasSearch
                  ? 'Essayez un autre code ou nom de client.'
                  : 'Sélectionnez une autre date pour consulter un historique.'}
              </p>
            </div>
            {hasSearch && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Réinitialiser la recherche
              </button>
            )}
          </div>
        )}

        {/* Vue mobile (cartes) */}
        {!isLoading && !error && filteredParcels.length > 0 && (
          <>
            <div className="divide-y divide-slate-100 md:hidden">
              {filteredParcels.map((p) => {
                const weight = parseFloat(p.weight) || 0
                const price = weight * pricePerKg
                return (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-medium text-slate-900">
                        {p.qrcode}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {p.sender?.name ?? '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums text-slate-900">
                        {fmtMoney(price)} €
                      </p>
                      <p className="mt-0.5 text-xs tabular-nums text-slate-500">
                        {fmtKg(weight)} kg
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Vue desktop (tableau) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2.5 text-left font-medium">Code</th>
                    <th className="px-4 py-2.5 text-left font-medium">Client</th>
                    <th className="px-4 py-2.5 text-right font-medium">Kilos</th>
                    <th className="px-4 py-2.5 text-right font-medium">Prix total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParcels.map((p) => {
                    const weight = parseFloat(p.weight) || 0
                    const price = weight * pricePerKg
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-sm font-medium text-slate-900">
                            {p.qrcode}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {p.sender?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-slate-600">
                          {fmtKg(weight)} kg
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium tabular-nums text-slate-900">
                          {fmtMoney(price)} €
                        </td>
                      </tr>
                    )
                  })}
                </tbody>

                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                    <td className="px-4 py-3" colSpan={2}>
                      {hasSearch
                        ? `Total filtré (${filteredParcels.length})`
                        : `Total (${parcelCount})`}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmtKg(
                        hasSearch
                          ? filteredParcels.reduce(
                              (s, p) => s + (parseFloat(p.weight) || 0),
                              0
                            )
                          : totalWeight
                      )}{' '}
                      kg
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmtMoney(
                        hasSearch
                          ? filteredParcels.reduce(
                              (s, p) =>
                                s + (parseFloat(p.weight) || 0) * pricePerKg,
                              0
                            )
                          : totalPrice
                      )}{' '}
                      €
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}