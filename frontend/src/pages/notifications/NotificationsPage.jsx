// src/pages/notifications/NotificationsPage.jsx
import { useState }           from 'react'
import { useNotifications,
         useNotificationStats,
         useRetryNotification } from '../../hooks/useNotifications'

const STATUS_FILTERS = [
  { label: 'Toutes',      value: '' },
  { label: 'Envoyées',    value: 'sent' },
  { label: 'En attente',  value: 'pending' },
  { label: 'Échouées',    value: 'failed' },
]

// Config visuelle centralisée
const STATUS_CFG = {
  sent:    { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Envoyée'     },
  pending: { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400',   label: 'En attente'  },
  failed:  { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Échouée'     },
}

const CHANNEL_CFG = {
  email: { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Email' },
  sms:   { bg: 'bg-purple-50', text: 'text-purple-700', label: 'SMS'   },
}

const TYPE_CFG = {
  status_update: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Suivi'   },
  issue:         { bg: 'bg-red-50',    text: 'text-red-600',   label: 'Alerte'  },
  bulk_alert:    { bg: 'bg-purple-50', text: 'text-purple-700',label: 'Groupé'  },
}

function MiniPill({ cfg }) {
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5
                      rounded-full ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
}

export default function NotificationsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [search,       setSearch]       = useState('')

  const notifications = useNotifications({
    status:  statusFilter || undefined,
    search:  search       || undefined,
  })
  const stats  = useNotificationStats()
  const retry  = useRetryNotification()

  const data = notifications.data ?? []
  const s    = stats.data ?? {}

  const STAT_CARDS = [
    { label: 'Total',       value: s.total,   color: 'text-[#0F1923]' },
    { label: 'Envoyées',    value: s.sent,    color: 'text-emerald-500' },
    { label: 'En attente',  value: s.pending, color: 'text-amber-500' },
    { label: 'Échouées',    value: s.failed,  color: 'text-red-500' },
  ]

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ────────────────────────────────────── */}
      <div>
        <h1 style={{fontFamily:'var(--font-display)'}}
            className="text-xl font-bold text-[#0F1923]">
          Notifications
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Historique des envois email et SMS
        </p>
      </div>

      {/* ── Stats cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, color }) => (
          <div key={label}
               className="bg-white border border-slate-100
                          rounded-xl px-5 py-4">
            <p style={{fontFamily:'var(--font-display)'}}
               className={`text-2xl font-bold ${color}`}>
              {value ?? '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ───────────────────────────────────── */}
      <div className="flex items-center gap-2 bg-white border-[1.5px]
                      border-slate-200 rounded-lg px-3 py-2.5
                      focus-within:border-[#E8673C] transition-all">
        <span className="text-slate-300 text-sm">⌕</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Code colis, email ou téléphone…"
          className="flex-1 text-sm outline-none bg-transparent
                     text-[#0F1923] placeholder-slate-300"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-slate-300 hover:text-slate-500
                       transition-colors leading-none"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Filtres statut ────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`text-xs px-3 py-1.5 rounded-lg border
                        transition-all ${
              statusFilter === f.value
                ? 'bg-[#0F1923] text-white border-[#0F1923]'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Table ─────────────────────────────────────── */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">

        {/* Header table */}
        <div className="flex items-center gap-3 px-5 py-3.5
                        border-b border-slate-100">
          <p style={{fontFamily:'var(--font-display)'}}
             className="text-sm font-bold text-[#0F1923] flex-1">
            Historique
          </p>
          <span className="text-xs text-slate-400 bg-slate-50
                           px-3 py-1 rounded-full">
            {data.length} notification{data.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Chargement */}
        {notifications.isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#E8673C]
                            border-t-transparent rounded-full animate-spin"/>
          </div>
        )}

        {/* Table */}
        {!notifications.isLoading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Colis','Destinataire','Canal','Type','Statut','Date',''].map(h => (
                    <th key={h}
                        className="text-left text-[10px] font-semibold
                                   text-slate-400 uppercase tracking-wide
                                   px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {data.length === 0 && (
                  <tr>
                    <td colSpan="7"
                        className="text-center py-14 text-sm text-slate-400">
                      Aucune notification pour ce filtre.
                    </td>
                  </tr>
                )}

                {data.map(notif => {
                  const sCfg = STATUS_CFG[notif.status]
                  const cCfg = CHANNEL_CFG[notif.channel]
                  const tCfg = TYPE_CFG[notif.type]

                  return (
                    <tr key={notif.id}
                        className="border-b border-slate-50
                                   last:border-0 hover:bg-slate-50/50
                                   transition-colors">

                      {/* Code colis */}
                      <td className="px-5 py-3.5">
                        <span style={{fontFamily:'var(--font-display)'}}
                              className="text-xs font-semibold text-[#E8673C]">
                          {notif.parcel?.barcode ?? '—'}
                        </span>
                      </td>

                      {/* Destinataire */}
                      <td className="px-5 py-3.5">
                        <p className="text-xs text-slate-600">
                          {notif.recipientEmail ?? notif.recipientPhone ?? '—'}
                        </p>
                      </td>

                      {/* Canal */}
                      <td className="px-5 py-3.5">
                        <MiniPill cfg={cCfg} />
                      </td>

                      {/* Type */}
                      <td className="px-5 py-3.5">
                        <MiniPill cfg={tCfg} />
                      </td>

                      {/* Statut + erreur */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5
                                         text-[10px] font-medium px-2.5 py-1
                                         rounded-full ${sCfg.bg} ${sCfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full
                                           ${sCfg.dot}`}/>
                          {sCfg.label}
                        </span>
                        {notif.errorMessage && (
                          <p className="text-[10px] text-red-500 mt-0.5">
                            {notif.errorMessage}
                          </p>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-5 py-3.5 text-[11px] text-slate-400">
                        {notif.sentAt
                          ? new Date(notif.sentAt).toLocaleDateString('fr-FR', {
                              day: 'numeric', month: 'short',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : new Date(notif.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric', month: 'short',
                              hour: '2-digit', minute: '2-digit',
                            })
                        }
                      </td>

                      {/* Action relancer */}
                      <td className="px-5 py-3.5">
                        {notif.status === 'failed' && (
                          <button
                            onClick={() => retry.mutate(notif.id)}
                            disabled={retry.isPending}
                            className="text-xs border border-slate-200
                                       text-slate-500 hover:border-[#E8673C]
                                       hover:text-[#E8673C] disabled:opacity-40
                                       px-3 py-1.5 rounded-lg transition-all"
                          >
                            Relancer
                          </button>
                        )}
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}