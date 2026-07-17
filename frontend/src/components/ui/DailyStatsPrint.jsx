// src/pages/stats/DailyStatsPrint.jsx
const DailyStatsPrint = ({ selectedDate, totalWeight, totalPrice, parcels, pricePerKg }) => {
  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="p-6 bg-white">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Statistiques journalières</h1>
      <p className="text-sm text-slate-500 mb-6">Colis du {dateLabel}</p>

      {/* Totaux */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{totalWeight}</p>
          <p className="text-xs text-slate-400 mt-1">Total kilos</p>
        </div>
        <div className="bg-violet-600 rounded-2xl p-2 text-white shadow-sm">
          <p className="text-2xl font-bold">{totalPrice} €</p>
          <p className="text-xs text-white/70 mt-1">Total prix</p>
        </div>
      </div>

      {/* Tableau */}
      <h2 className="font-bold text-slate-900 mb-3">Colis de la journée ({parcels?.length || 0})</h2>
      {parcels?.length > 0 ? (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left text-xs font-semibold text-slate-400 uppercase px-4 py-2">Code</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase px-4 py-2">Expéditeur</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase px-4 py-2">Kilos</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase px-4 py-2">Prix total</th>
            </tr>
          </thead>
          <tbody>
            {parcels.map(p => {
              const weight = parseFloat(p.weight) || 0;
              const price = (weight * pricePerKg).toFixed(2);
              return (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-bold text-violet-600">{p.qrcode}</td>
                  <td className="px-4 py-2 text-slate-600">{p.sender?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-600">{weight} kg</td>
                  <td className="px-4 py-2 font-semibold text-slate-800">{price} €</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
              <td className="px-4 py-2 text-slate-600 text-xs uppercase">Total</td>
              <td></td>
              <td className="px-4 py-2 text-slate-900">{totalWeight} kg</td>
              <td className="px-4 py-2 text-slate-900">{totalPrice} €</td>
            </tr>
          </tfoot>
        </table>
      ) : (
        <p className="text-slate-400 text-sm">Aucun colis ce jour.</p>
      )}
    </div>
  );
};

export default DailyStatsPrint;