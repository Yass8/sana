// src/pages/dashboard/DashboardPage.jsx
import { useNavigate }       from 'react-router-dom'
import { useAuth }           from '../../context/AuthContext'
import { useDashboardStats } from '../../hooks/useDashboardStats'
import { useParcels }        from '../../hooks/useParcels'
import StatusBadge           from '../../components/ui/StatusBadge'
import Card                  from '../../components/ui/Card'
import Spinner               from '../../components/ui/Spinner'

function StatCard({ label, value, sub, variant = 'default' }) {
  const variants = {
    default: 'bg-white',
    dark:    'bg-[#0A1628]',
    violet:  'bg-violet-600',
    green:   'bg-white',
  }
  const numColors = {
    default: 'text-slate-900',
    dark:    'text-white',
    violet:  'text-white',
    green:   'text-emerald-500',
  }
  const lblColors = {
    default: 'text-slate-400',
    dark:    'text-white/40',
    violet:  'text-white/70',
    green:   'text-slate-400',
  }
  return (
    <div className={`${variants[variant]} rounded-2xl p-4 md:p-5
                     border border-slate-100 shadow-sm`}>
      <p style={{fontFamily:'var(--font-display)'}}
         className={`text-3xl font-bold ${numColors[variant]}`}>
        {value ?? '—'}
      </p>
      <p className={`text-xs mt-1 ${lblColors[variant]}`}>{label}</p>
      {sub && <p className="text-xs text-emerald-500 font-semibold mt-1">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const stats     = useDashboardStats()
  const parcels   = useParcels({ limit: 5, sortBy: 'createdAt', sortDir: 'DESC' })

  const s    = stats.data ?? {}
  const data = parcels.data?.rows ?? []

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 style={{fontFamily:'var(--font-display)'}}
              className="text-xl md:text-2xl font-bold text-slate-900">
            Bonjour, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long'
            })}
          </p>
        </div>
        <button
          onClick={() => navigate('/scan')}
          className="hidden md:flex items-center gap-2 bg-violet-600
                     hover:bg-violet-700 text-white text-sm font-semibold
                     px-4 py-2.5 rounded-xl transition-colors"
        >
          ⬡ Scanner
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Colis aujourd'hui" value={s.todayCount}
                  sub={s.todayDiff > 0 ? `↑ +${s.todayDiff} vs hier` : null}/>
        <StatCard label="Sacs en transit"   value={s.bagsInTransit} variant="dark"/>
        <StatCard label="Problèmes actifs"  value={s.issues}        variant="violet"/>
        <StatCard label="Livrés ce mois"    value={s.monthDelivered} variant="green"/>
      </div>

      {/* Derniers colis */}
      <Card>
        <div className="flex items-center justify-between px-4 md:px-5 py-4
                        border-b border-slate-100">
          <h2 style={{fontFamily:'var(--font-display)'}}
              className="font-bold text-slate-900">
            Colis récents
          </h2>
          <button onClick={() => navigate('/parcels')}
                  className="text-xs text-violet-600 font-semibold hover:underline">
            Voir tout
          </button>
        </div>

        {parcels.isLoading && (
          <div className="flex justify-center py-10">
            <Spinner/>
          </div>
        )}

        {/* Mobile — cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {data.map(p => (
            <div key={p.id} onClick={() => navigate(`/parcels/${p.id}`)}
                 className="px-4 py-3.5 cursor-pointer hover:bg-slate-50
                            transition-colors">
              <div className="flex items-center justify-between gap-2">
                <p style={{fontFamily:'var(--font-display)'}}
                   className="text-sm font-bold text-violet-600">
                  {p.barcode}
                </p>
                <StatusBadge status={p.status}/>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {p.sender?.name} → {p.recipientName}
              </p>
            </div>
          ))}
        </div>

        {/* Desktop — table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Code','Expéditeur','Destinataire','Destination','Statut'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold
                                         text-slate-400 uppercase tracking-wide
                                         px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(p => (
                <tr key={p.id} onClick={() => navigate(`/parcels/${p.id}`)}
                    className="border-b border-slate-50 hover:bg-violet-50/50
                               cursor-pointer transition-colors last:border-0">
                  <td className="px-5 py-3.5">
                    <span style={{fontFamily:'var(--font-display)'}}
                          className="text-xs font-bold text-violet-600">
                      {p.barcode}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{p.sender?.name ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-600">{p.recipientName}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-400">
                    {p.bag?.shipment?.destinationAgency?.city ?? '—'}
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={p.status}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  )
}