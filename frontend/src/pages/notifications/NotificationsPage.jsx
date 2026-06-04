// src/pages/notifications/NotificationsPage.jsx
import { useState } from 'react'
import { useNotifications, useNotificationStats } from '../../hooks/useNotifications'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'

const STATUS_CFG = {
  sent:    { bg:'bg-emerald-50', text:'text-emerald-700', dot:'bg-emerald-500', label:'Envoyée'    },
  pending: { bg:'bg-amber-50',   text:'text-amber-700',   dot:'bg-amber-400',   label:'En attente' },
  failed:  { bg:'bg-red-50',     text:'text-red-700',     dot:'bg-red-500',     label:'Échouée'    },
}
const CHANNEL_CFG = {
  email: { bg:'bg-blue-50',   text:'text-blue-700',   label:'Email' },
  sms:   { bg:'bg-purple-50', text:'text-purple-700', label:'SMS'   },
}
const TYPE_CFG = {
  status_update: { bg:'bg-slate-100', text:'text-slate-600', label:'Suivi'  },
  issue:         { bg:'bg-red-50',    text:'text-red-600',   label:'Alerte' },
  bulk_alert:    { bg:'bg-violet-50', text:'text-violet-700',label:'Groupé' },
}

function Pill({ cfg }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
}

const STATUS_FILTERS = [
  { label: 'Toutes',     value: '' },
  { label: 'Envoyées',   value: 'sent' },
  { label: 'En attente', value: 'pending' },
  { label: 'Échouées',   value: 'failed' },
]

const CHANNEL_FILTERS = [
  { label: 'Tous',  value: '' },
  { label: 'Email', value: 'email' },
  { label: 'SMS',   value: 'sms' },
]

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

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'
    })
  }

  return (
    <div className="flex flex-col gap-5 animate-fadeIn mb-10 md:mb-25 lg:mb-0">

      <div>
        <h1 style={{fontFamily:'var(--font-display)'}}
            className="text-xl md:text-2xl font-bold text-slate-900">Notifications</h1>
        <p className="text-xs text-slate-400 mt-0.5">Historique des emails et SMS</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total',      value: s.total,   color: 'text-slate-900' },
          { label: 'Envoyées',   value: s.sent,    color: 'text-emerald-500' },
          { label: 'En attente', value: s.pending, color: 'text-amber-500' },
          { label: 'Échouées',   value: s.failed,  color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-slate-100
                                      rounded-2xl px-4 md:px-5 py-4 shadow-sm">
            <p style={{fontFamily:'var(--font-display)'}}
               className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Barre de recherche + filtres */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white border-2 border-slate-200
                        rounded-xl px-4 py-3 focus-within:border-violet-500
                        focus-within:ring-4 focus-within:ring-violet-100 transition-all">
          <span className="text-slate-300">⌕</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                 placeholder="Code colis, email…"
                 className="flex-1 text-sm outline-none bg-transparent text-slate-900"/>
          {search && (
            <button onClick={() => setSearch('')}
                    className="text-slate-300 hover:text-slate-500 transition-colors">✕</button>
          )}
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs border-2 border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 outline-none focus:border-violet-500"
          >
            {STATUS_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <select
            value={channelFilter}
            onChange={e => setChannelFilter(e.target.value)}
            className="text-xs border-2 border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 outline-none focus:border-violet-500"
          >
            {CHANNEL_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="text-xs border-2 border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 hover:border-violet-500 transition-colors flex items-center gap-1"
          >
            {sortOrder === 'desc' ? 'Plus récent' : 'Plus ancien'}
            <span className="text-[10px]">▼</span>
          </button>
        </div>
      </div>

      {notifs.isLoading ? (
        <div className="flex justify-center py-16"><Spinner/></div>
      ) : (
        <Card>
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <p style={{fontFamily:'var(--font-display)'}}
               className="font-bold text-slate-900 flex-1">Historique</p>
            <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
              {data.length} notification{data.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-slate-100">
            {data.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-12">Aucune notification.</p>
            )}
            {data.map(n => {
              const sc = STATUS_CFG[n.status]
              return (
                <div key={n.id} className="px-4 py-3.5" onClick={() => setExpandedId(prev => prev === n.id ? null : n.id)}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p style={{fontFamily:'var(--font-display)'}}
                       className="text-sm font-bold text-violet-600">
                      {n.parcel?.qrcode ?? '—'}
                    </p>
                    <span className={`inline-flex items-center gap-1.5 text-[10px]
                                      font-semibold px-2 py-0.5 rounded-full
                                      ${sc.bg} ${sc.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/>
                      {sc.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Pill cfg={CHANNEL_CFG[n.channel]}/>
                    <Pill cfg={TYPE_CFG[n.type]}/>
                    <span className="text-[11px] text-slate-400">
                      {n.recipientEmail ?? n.recipientPhone ?? '—'}
                    </span>
                  </div>
                  {expandedId === n.id && (
                    <div className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
                      <p><span className="font-medium">Date :</span> {formatDate(n.sentAt ?? n.createdAt)}</p>
                      {n.errorMessage && (
                        <p className="text-red-500 mt-1"><span className="font-medium">Erreur :</span> {n.errorMessage}</p>
                      )}
                      {/* <p><span className="font-medium">ID :</span> {n.id}</p> */}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Colis','Destinataire','Canal','Type','Statut','Date',''].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-slate-400
                                           uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 && (
                  <tr><td colSpan="7"
                          className="text-center py-14 text-sm text-slate-400">
                    Aucune notification.
                  </td></tr>
                )}
                {data.map(n => {
                  const sc = STATUS_CFG[n.status]
                  return (
                    <tr key={n.id}
                        className="border-b border-slate-50 last:border-0
                                   hover:bg-slate-50/50 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(prev => prev === n.id ? null : n.id)}>
                      <td className="px-5 py-3.5">
                        <span style={{fontFamily:'var(--font-display)'}}
                              className="text-xs font-bold text-violet-600">
                          {n.parcel?.qrcode ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">
                        {n.recipientEmail ?? n.recipientPhone ?? '—'}
                      </td>
                      <td className="px-5 py-3.5"><Pill cfg={CHANNEL_CFG[n.channel]}/></td>
                      <td className="px-5 py-3.5"><Pill cfg={TYPE_CFG[n.type]}/></td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-[10px]
                                          font-semibold px-2.5 py-1 rounded-full
                                          ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/>
                          {sc.label}
                        </span>
                        {n.errorMessage && (
                          <p className="text-[10px] text-red-500 mt-0.5">{n.errorMessage}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[11px] text-slate-400">
                        {formatDate(n.sentAt ?? n.createdAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        {/* Aucune action de relancement */}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}