// src/pages/history/DailyHistoryPage.jsx
import { useState, useMemo } from 'react';
import { useDailyParcels } from '../../hooks/useDailyParcels';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
// Initialisation des polices pdfmake
pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

function StatCard({ label, value, variant = 'default' }) {
  const variants = {
    default: 'bg-white',
    dark: 'bg-[#0A1628]',
    violet: 'bg-violet-600',
    green: 'bg-white',
  };
  const numColors = {
    default: 'text-slate-900',
    dark: 'text-white',
    violet: 'text-white',
    green: 'text-emerald-500',
  };
  const lblColors = {
    default: 'text-slate-400',
    dark: 'text-white/40',
    violet: 'text-white/70',
    green: 'text-slate-400',
  };
  return (
    <div className={`${variants[variant]} rounded-2xl p-4 md:p-5 border border-slate-100 shadow-sm`}>
      <p style={{ fontFamily: 'var(--font-display)' }} className={`text-3xl font-bold ${numColors[variant]}`}>
        {value ?? '—'}
      </p>
      <p className={`text-xs mt-1 ${lblColors[variant]}`}>{label}</p>
    </div>
  );
}

function SearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        placeholder="Rechercher par code ou expéditeur..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-800 bg-white shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-colors"
      />
    </div>
  );
}

function ParcelsTable({
  parcels,
  totalWeight,
  totalPrice,
  pricePerKg,
  isLoading,
  error,
  allParcelsCount,
  searchQuery,
}) {
  // Titre dynamique
  const title =
    searchQuery.trim()
      ? `Colis de la journée (${parcels.length} filtrés / ${allParcelsCount} total)`
      : `Colis de la journée (${allParcelsCount})`;

  return (
    <>
      <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-slate-100">
        <h2 style={{ fontFamily: 'var(--font-display)' }} className="font-bold text-slate-900">
          {title}
        </h2>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
      {error && (
        <div className="px-4 md:px-5 py-10 text-center text-red-500 text-sm">
          Erreur lors du chargement.
        </div>
      )}
      {!isLoading && !error && parcels.length === 0 && (
        <div className="px-4 md:px-5 py-10 text-center text-slate-400 text-sm">
          {searchQuery ? 'Aucun colis ne correspond à votre recherche.' : 'Aucun colis ce jour.'}
        </div>
      )}

      {/* Mobile – cartes */}
      <div className="md:hidden divide-y divide-slate-100">
        {parcels.map(p => {
          const weight = parseFloat(p.weight) || 0;
          const price = (weight * pricePerKg).toFixed(2);
          return (
            <div key={p.id} className="px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <p style={{ fontFamily: 'var(--font-display)' }} className="text-sm font-bold text-violet-600">
                  {p.qrcode}
                </p>
                <span className="text-xs font-medium text-slate-600">{weight} kg</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-slate-500">{p.sender?.name ?? '—'}</p>
                <p className="text-xs font-semibold text-slate-800">{price} €</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop – tableau */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Code', 'Expéditeur', 'Kilos', 'Prix total'].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parcels.map(p => {
              const weight = parseFloat(p.weight) || 0;
              const price = (weight * pricePerKg).toFixed(2);
              return (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-violet-50/50 transition-colors last:border-0">
                  <td className="px-5 py-3.5">
                    <span style={{ fontFamily: 'var(--font-display)' }} className="text-xs font-bold text-violet-600">
                      {p.qrcode}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{p.sender?.name ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-600">{weight} kg</td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800">{price} €</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-100 font-semibold">
              <td className="px-5 py-3 text-slate-600 text-xs uppercase tracking-wide">Total</td>
              <td />
              <td className="px-5 py-3 text-slate-900">{totalWeight} kg</td>
              <td className="px-5 py-3 text-slate-900">{totalPrice} €</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

// --------------------------------------------------------
// Composant principal
// --------------------------------------------------------
export default function DailyHistoryPage() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [pricePerKg, setPricePerKg] = useState(17);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: parcels, isLoading, error } = useDailyParcels(selectedDate);

  // Filtrage des colis pour l'affichage (les totaux restent basés sur tous les colis)
  const filteredParcels = useMemo(() => {
    if (!searchQuery.trim()) return parcels;
    const query = searchQuery.toLowerCase();
    return (parcels || []).filter(p => {
      const code = (p.qrcode || '').toLowerCase();
      const sender = (p.sender?.name || '').toLowerCase();
      return code.includes(query) || sender.includes(query);
    });
  }, [parcels, searchQuery]);

  // Totaux 
  const { totalWeight, totalPrice } = useMemo(() => {
    let weight = 0;
    (parcels || []).forEach(p => {
      const w = parseFloat(p.weight) || 0;
      weight += w;
    });
    return {
      totalWeight: weight.toFixed(2),
      totalPrice: (weight * pricePerKg).toFixed(2),
    };
  }, [parcels, pricePerKg]);

  // Formater la date pour l'affichage
  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleDownloadPdf = () => {
    const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // ---- En-tête avec le nom de l'entreprise ----
    const header = {
      columns: [
        {
          width: '*',
          stack: [
            { text: 'SanaService', style: 'companyName' },
            { text: 'Rapport journalier – Historique des colis expédiés', style: 'reportSubtitle' },
          ],
          
        },
        {
          text: dateLabel,
          style: 'headerDate',
          alignment: 'right',
        },
      ],
      
      margin: [40, 10, 40, 20],
    };

    // ---- Bloc des totaux (kilos & prix) ----
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
                    { text: `${totalWeight} kg`, style: 'totalNumber' },
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
                    { text: `${totalPrice} €`, style: 'totalNumberPrice' },
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
    };

    // ---- Prix au kilo ----
    const pricePerKgBlock = {
      text: `Prix au kilo : ${pricePerKg} €`,
      style: 'footnote',
      margin: [0, 0, 0, 10],
    };

    // ---- Tableau des colis (identique à la version précédente) ----
    const tableHeaderStyle = {
      fontSize: 9,
      bold: true,
      color: '#475569',
      fillColor: '#F1F5F9',
      margin: [0, 4, 0, 4],
    };

    const tableBody = [
      [
        { text: 'Code', style: 'tableHeader' },
        { text: 'Expéditeur', style: 'tableHeader' },
        { text: 'Kilos', style: 'tableHeader', alignment: 'center' },
        { text: 'Prix total', style: 'tableHeader', alignment: 'right' },
      ],
    ];

    (parcels || []).forEach((p, index) => {
      const weight = parseFloat(p.weight) || 0;
      const price = (weight * pricePerKg).toFixed(2);
      const rowFill = index % 2 === 0 ? null : '#F8FAFC';

      tableBody.push([
        { text: p.qrcode, style: 'qrCode', fillColor: rowFill },
        { text: p.sender?.name || '—', fillColor: rowFill },
        { text: `${weight} kg`, alignment: 'center', fillColor: rowFill },
        { text: `${price} €`, alignment: 'right', fillColor: rowFill },
      ]);
    });

    // Ligne des totaux
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
        text: `${totalWeight} kg`,
        bold: true,
        alignment: 'center',
        fillColor: '#F1F5F9',
      },
      {
        text: `${totalPrice} €`,
        bold: true,
        alignment: 'right',
        fillColor: '#F1F5F9',
      },
    ]);

    const dataTable = {
      table: {
        headerRows: 1,
        widths: ['auto', '*', 'auto', 'auto'],
        body: tableBody,
      },
      layout: {
        hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 0.5),
        vLineWidth: () => 0,
        hLineColor: () => '#CBD5E1',
        paddingTop: () => 8,
        paddingBottom: () => 8,
        paddingLeft: (i) => (i === 0 ? 10 : 5),
        paddingRight: (i, node) => (i === node.table.widths.length - 1 ? 10 : 5),
      },
      margin: [0, 0, 0, 10],
    };

    // ---- Pied de page ----
    const footer = (currentPage, pageCount) => {
      return {
        text: `Page ${currentPage} / ${pageCount}`,
        alignment: 'center',
        fontSize: 8,
        color: '#94A3B8',
        margin: [0, 20, 0, 0],
      };
    };

    // ---- Document final ----
    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 50],
      header: () => header,
      footer: footer,
      content: [
        totalsBlock,
        {
          text: `Colis de la journée (${parcels?.length || 0})`,
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
        reportSubtitle: {
          fontSize: 8.5,
          color: '#64748B',
          margin: [0, 2, 0, 0],
        },
        headerDate: {
          fontSize: 10,
          color: '#475569',
          alignment: 'right',
        },
        totalNumber: {
          fontSize: 22,
          bold: true,
          color: '#0F172A',
        },
        totalNumberPrice: {
          fontSize: 22,
          bold: true,
          color: '#7C3AED',
        },
        totalLabel: {
          fontSize: 9,
          color: '#64748B',
          margin: [0, 4, 0, 0],
        },
        sectionTitle: {
          fontSize: 12,
          bold: true,
          color: '#0F172A',
        },
        tableHeader: tableHeaderStyle,
        qrCode: {
          color: '#7C3AED',
          bold: true,
          fontSize: 9,
        },
        footnote: {
          fontSize: 7.5,
          color: '#94A3B8',
          italics: true,
        },
      },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 9.5,
        lineHeight: 1.3,
        color: '#334155',
      },
    };

    const pdfDoc = pdfMake.createPdf(docDefinition);
    pdfDoc.download(`historique-SanaService-${selectedDate}.pdf`);
  };


  return (
    <div id="daily-history-print" className="flex flex-col gap-5 animate-fadeIn">
      {/* En-tête avec la date – visible à l’impression, mais l’input date reste masqué */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-xl md:text-2xl font-bold text-slate-900">
            Historique des colis
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Consultation du {dateLabel}
          </p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          max={todayStr}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-white shadow-sm hover:border-violet-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-colors"
        />
      </div>

      {/* Barre prix + bouton – entièrement masquée à l’impression */}
      <div className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5">
        <label className="text-sm text-slate-500 whitespace-nowrap">Prix au kilo (€)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={pricePerKg}
          onChange={(e) => setPricePerKg(parseFloat(e.target.value) || 0)}
          className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white shadow-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-colors"
        />
        <button onClick={handleDownloadPdf} className="ml-1 md:ml-2 rounded-md md:rounded-xl bg-violet-600 px-2 md:px-4 py-2 text-xs md:text-sm font-semibold text-white shadow-sm hover:bg-violet-700 transition-colors">
          Télécharger PDF
        </button>
      </div>

      {/* Totaux */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total kilos" value={`${totalWeight} kg`} />
        <StatCard label="Total prix" value={`${totalPrice} €`} variant="violet" />
      </div>

      {/* Recherche */}
      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      {/* Tableau des colis */}
      <Card className="mb-10 md:mb-24">
        <ParcelsTable
          parcels={filteredParcels || []}
          totalWeight={totalWeight}
          totalPrice={totalPrice}
          pricePerKg={pricePerKg}
          isLoading={isLoading}
          error={error}
          allParcelsCount={parcels?.length || 0}
          searchQuery={searchQuery}
        />
      </Card>
    </div>
  );
}