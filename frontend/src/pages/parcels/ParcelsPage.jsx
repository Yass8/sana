// src/pages/parcels/ParcelsPage.jsx
import { useState }      from 'react'
import { useNavigate }   from 'react-router-dom'
import { useAuth }       from '../../context/AuthContext'
import { useParcels }    from '../../hooks/useParcels'
import StatusBadge       from '../../components/ui/StatusBadge'
import Card              from '../../components/ui/Card'
import Spinner           from '../../components/ui/Spinner'
import Skeleton          from '../../components/ui/Skeleton'

const FILTERS = [
  { label: 'Tous',         value: '' },
  { label: 'Réceptionné',  value: 'received' },
  { label: 'En vol',       value: 'departed_airport' },
  { label: 'Arrivé',       value: 'arrived_destination' },
  { label: 'Retiré',       value: 'collected' },
  { label: 'Problème',     value: 'issue' },
]

const PAGE_SIZE = 15

function SortIcon({ field, sortField, sortDir }) {
  return sortField !== field
    ? <span className="text-slate-300 ml-1">↕</span>
    : <span className="text-violet-600 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

export default function ParcelsPage() {
  const navigate    = useNavigate()
  const { isRole }  = useAuth()
  const [status,    setStatus]  = useState('')
  const [search,    setSearch]  = useState('')
  const [page,      setPage]    = useState(1)
  const [sort,      setSort]    = useState({ field: 'createdAt', dir: 'DESC' })

  const parcels = useParcels({
    status:  status  || undefined,
    search:  search  || undefined,
    page, limit: PAGE_SIZE,
    sortBy:  sort.field, sortDir: sort.dir,
  })

  const data       = parcels.data?.rows       ?? []
  const totalCount = parcels.data?.count      ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const handleSort = (field) => {
    setSort(p => p.field === field
      ? { field, dir: p.dir === 'asc' ? 'desc' : 'asc' }
      : { field, dir: 'desc' })
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-5 animate-fadeIn mb:2 md:mb-25 lg:mb-0">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 style={{fontFamily:'var(--font-display)'}}
              className="text-xl md:text-2xl font-bold text-slate-900">
            Colis
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">{totalCount} colis au total</p>
        </div>
        {isRole('agent_fr', 'admin') && (
          <button onClick={() => navigate('/parcels/new')}
                  className="bg-violet-600 hover:bg-violet-700 text-white
                             text-sm font-semibold px-4 py-2.5 rounded-xl
                             transition-colors">
            + Nouveau
          </button>
        )}
      </div>

      {/* Recherche */}
      <div className="flex items-center gap-2 bg-white border-2 border-slate-200
                      rounded-xl px-4 py-3 focus-within:border-violet-500
                      focus-within:ring-4 focus-within:ring-violet-100 transition-all">
        <span className="text-slate-300">⌕</span>
        <input type="text" value={search}
               onChange={e => { setSearch(e.target.value); setPage(1) }}
               placeholder="Code, expéditeur, destinataire…"
               className="flex-1 text-sm outline-none bg-transparent text-slate-900"/>
        {search && (
          <button onClick={() => { setSearch(''); setPage(1) }}
                  className="text-slate-300 hover:text-slate-500 transition-colors">✕</button>
        )}
      </div>

      {/* Filtres — scroll horizontal sur mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => { setStatus(f.value); setPage(1) }}
                  className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-xl
                              border-2 transition-all shrink-0 font-semibold ${
                    status === f.value
                      ? 'bg-[#0A1628] text-white border-[#0A1628]'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {parcels.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="p-5">
              <div className="space-y-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-4/5" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className='mb-10 md:mb-0 lg:mb-0'>
          <div className="flex items-center gap-3 px-4 md:px-5 py-3.5
                          border-b border-slate-100">
            <p style={{fontFamily:'var(--font-display)'}}
               className="font-bold text-slate-900 flex-1">Liste des colis</p>
            <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
              {totalCount} résultat{totalCount > 1 ? 's' : ''}
            </span>
          </div>

          {/* Mobile — cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {data.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-12">
                Aucun colis pour ce filtre.
              </p>
            )}
            {data.map(p => (
              <div key={p.id} onClick={() => navigate(`/parcels/${p.id}`)}
                   className="px-4 py-3.5 cursor-pointer hover:bg-violet-50/50
                              transition-colors">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p style={{fontFamily:'var(--font-display)'}}
                     className="text-sm font-bold text-violet-600">{p.qrcode}</p>
                  <StatusBadge status={p.status} updatedAt={p.updatedAt} />
                </div>
                <p className="text-xs text-slate-500">
                  {p.sender?.name} → {p.recipientName}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {new Date(p.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            ))}
          </div>

          {/* Desktop — table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th onClick={() => handleSort('qrcode')}
                      className="text-left text-[10px] font-semibold text-slate-400
                                 uppercase tracking-wide px-5 py-3 cursor-pointer
                                 hover:text-slate-600 select-none">
                    Code <SortIcon field="qrcode" sortField={sort.field} sortDir={sort.dir} />
                  </th>
                  {['Expéditeur','Destinataire','Destination','Sac'].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-slate-400
                                           uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}
                  <th className="text-left text-[10px] font-semibold text-slate-400
                                 uppercase tracking-wide px-5 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 && (
                  <tr><td colSpan="7"
                          className="text-center py-14 text-sm text-slate-400">
                    Aucun colis pour ce filtre.
                  </td></tr>
                )}
                {data.map(p => (
                  <tr key={p.id} onClick={() => navigate(`/parcels/${p.id}`)}
                      className="border-b border-slate-50 hover:bg-violet-50/50
                                 cursor-pointer transition-colors last:border-0">
                    <td className="px-5 py-3.5">
                      <p style={{fontFamily:'var(--font-display)'}}
                         className="text-xs font-bold text-violet-600">{p.qrcode}</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">
                        {new Date(p.createdAt).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{p.sender?.name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600">{p.recipientName}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">
                      {p.bag?.destinationAgency?.city ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-400">
                      {p.bag?.qrcode ?? '—'}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={p.status} updatedAt={p.updatedAt} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5
                            border-t border-slate-100">
              <p className="text-xs text-slate-400">
                {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE,totalCount)} sur {totalCount}
              </p>
              <div className="flex gap-1.5">
                <button onClick={() => setPage(p => p-1)} disabled={page===1}
                        className="px-3 py-1.5 border-2 border-slate-200 text-slate-500
                                   rounded-xl text-xs disabled:opacity-40
                                   hover:border-violet-500 hover:text-violet-600
                                   transition-all disabled:cursor-not-allowed">←</button>
                {Array.from({length: totalPages}, (_,i) => i+1)
                  .filter(p => p===1 || p===totalPages || Math.abs(p-page)<=1)
                  .reduce((acc,p,i,arr) => {
                    if(i>0 && p-arr[i-1]>1) acc.push('...')
                    acc.push(p); return acc
                  }, [])
                  .map((p,i) => p==='...'
                    ? <span key={`e${i}`} className="px-2 text-xs text-slate-300">…</span>
                    : <button key={p} onClick={() => setPage(p)}
                              className={`px-3 py-1.5 border-2 rounded-xl text-xs
                                          transition-all font-semibold ${
                                p===page
                                  ? 'bg-violet-600 text-white border-violet-600'
                                  : 'border-slate-200 text-slate-500 hover:border-violet-500 hover:text-violet-600'
                              }`}>{p}</button>
                  )
                }
                <button onClick={() => setPage(p => p+1)} disabled={page===totalPages}
                        className="px-3 py-1.5 border-2 border-slate-200 text-slate-500
                                   rounded-xl text-xs disabled:opacity-40
                                   hover:border-violet-500 hover:text-violet-600
                                   transition-all disabled:cursor-not-allowed">→</button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}