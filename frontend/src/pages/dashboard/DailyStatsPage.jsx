// src/pages/stats/DailyStatsPage.jsx
import { useState, useMemo } from 'react';
import { useDailyParcels } from '../../hooks/useDailyParcels'; // ← changé
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';

function StatCard({ label, value, variant = 'default' }) {
  // identique à l’existant
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

export default function DailyStatsPage() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [pricePerKg, setPricePerKg] = useState(17);

  // Nouveau hook dédié
  const { data: parcels, isLoading, error } = useDailyParcels(selectedDate);

  // Calculs
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

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-xl md:text-2xl font-bold text-slate-900">
            Statistiques journalières
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Colis du{' '}
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
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

      {/* Prix / kg */}
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
      </div>

      {/* Totaux */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total kilos" value={totalWeight} />
        <StatCard label="Total prix" value={`${totalPrice} €`} variant="violet" />
      </div>

      {/* Liste des colis */}
      <Card className="mb-10 md:mb-24">
        <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-slate-100">
          <h2 style={{ fontFamily: 'var(--font-display)' }} className="font-bold text-slate-900">
            Colis de la journée ({parcels?.length || 0})
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
        {!isLoading && !error && parcels?.length === 0 && (
          <div className="px-4 md:px-5 py-10 text-center text-slate-400 text-sm">
            Aucun colis ce jour.
          </div>
        )}

        {/* Mobile – cartes */}
        <div className="md:hidden divide-y divide-slate-100">
          {parcels?.map(p => {
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
              {parcels?.map(p => {
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
      </Card>
    </div>
  );
}