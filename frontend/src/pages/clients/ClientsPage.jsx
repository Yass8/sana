// src/pages/clients/ClientsPage.jsx
import { useState }      from 'react'
import { useClients, useSendBulkMessage } from '../../hooks/useClients'
import Card              from '../../components/ui/Card'
import Spinner           from '../../components/ui/Spinner'

const AVATAR_COLORS = ['#7C3AED','#059669','#2563EB','#D97706','#DC2626']
const avatarColor   = (id) => AVATAR_COLORS[id?.charCodeAt(0) % AVATAR_COLORS.length] ?? '#7C3AED'
const initials      = (name) => name?.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() ?? '?'

const CHANNELS = [
  { id: 'email', label: 'Email' },
  { id: 'sms',   label: 'SMS'   },
  { id: 'both',  label: 'Les deux' },
]

export default function ClientsPage() {
  const [search,    setSearch]    = useState('')
  const [selected,  setSelected]  = useState(new Set())
  const [showModal, setShowModal] = useState(false)
  const [channel,   setChannel]   = useState('email')
  const [message,   setMessage]   = useState('')
  const [toasted,   setToasted]   = useState(false)

  const clients  = useClients(search)
  const sendBulk = useSendBulkMessage()
  const data     = clients.data ?? []

  const toggleOne = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleAll = (checked) =>
    setSelected(checked ? new Set(data.map(c => c.id)) : new Set())

  const allChecked = data.length > 0 && data.every(c => selected.has(c.id))

  const handleSend = async () => {
    if (!message.trim()) return
    await sendBulk.mutateAsync({ userIds: [...selected], channel, message })
    setShowModal(false); setMessage(''); setSelected(new Set())
    setToasted(true); setTimeout(() => setToasted(false), 3000)
  }

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 style={{fontFamily:'var(--font-display)'}}
              className="text-xl md:text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-xs text-slate-400 mt-0.5">{data.length} clients</p>
        </div>
        <button onClick={() => setShowModal(true)} disabled={selected.size === 0}
                className="flex items-center gap-2 bg-[#0A1628] hover:bg-slate-800
                           disabled:opacity-40 disabled:cursor-not-allowed
                           text-white text-sm font-semibold px-4 py-2.5
                           rounded-xl transition-all">
          Envoyer un message
          {selected.size > 0 && (
            <span className="bg-violet-600 text-white text-[10px] font-bold
                             px-1.5 py-0.5 rounded-full">
              {selected.size}
            </span>
          )}
        </button>
      </div>

      {toasted && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700
                        text-sm px-4 py-3 rounded-xl animate-fadeIn">
          ✅ Message envoyé à {selected.size} client(s).
        </div>
      )}

      {/* Recherche */}
      <div className="flex items-center gap-2 bg-white border-2 border-slate-200
                      rounded-xl px-4 py-3 focus-within:border-violet-500
                      focus-within:ring-4 focus-within:ring-violet-100 transition-all">
        <span className="text-slate-300">⌕</span>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
               placeholder="Nom ou email…"
               className="flex-1 text-sm outline-none bg-transparent text-slate-900"/>
      </div>

      {selected.size > 0 && (
        <p className="text-xs text-violet-600 font-semibold bg-violet-50
                      px-3 py-1.5 rounded-xl">
          {selected.size} client{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}
        </p>
      )}

      {clients.isLoading ? (
        <div className="flex justify-center py-16"><Spinner/></div>
      ) : (
        <Card>

          {/* Mobile — cards cliquables */}
          <div className="md:hidden divide-y divide-slate-100">
            {data.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-12">Aucun client.</p>
            )}
            {data.map(c => (
              <div key={c.id} onClick={() => toggleOne(c.id)}
                   className={`px-4 py-3.5 cursor-pointer transition-colors ${
                     selected.has(c.id) ? 'bg-violet-50' : 'hover:bg-slate-50'
                   }`}>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={selected.has(c.id)}
                         onChange={() => toggleOne(c.id)}
                         onClick={e => e.stopPropagation()}
                         className="accent-violet-600 w-4 h-4"/>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center
                                  text-white text-xs font-bold flex-shrink-0"
                       style={{ background: avatarColor(c.id), fontFamily: 'var(--font-display)' }}>
                    {initials(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400 truncate">{c.email}</p>
                  </div>
                  <span className="text-[10px] font-semibold bg-blue-50 text-blue-700
                                   px-2 py-0.5 rounded-full flex-shrink-0">
                    {c._count?.parcels ?? 0} colis
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop — table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="w-10 px-5 py-3">
                    <input type="checkbox" checked={allChecked}
                           onChange={e => toggleAll(e.target.checked)}
                           className="accent-violet-600 w-4 h-4 cursor-pointer"/>
                  </th>
                  {['Client','Téléphone','Colis','Inscrit le'].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-slate-400
                                           uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 && (
                  <tr><td colSpan="5"
                          className="text-center py-14 text-sm text-slate-400">
                    Aucun client.
                  </td></tr>
                )}
                {data.map(c => (
                  <tr key={c.id} onClick={() => toggleOne(c.id)}
                      className={`border-b border-slate-50 cursor-pointer
                                  transition-colors last:border-0 ${
                        selected.has(c.id) ? 'bg-violet-50' : 'hover:bg-slate-50/80'
                      }`}>
                    <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(c.id)}
                             onChange={() => toggleOne(c.id)}
                             className="accent-violet-600 w-4 h-4 cursor-pointer"/>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center
                                        text-white text-[10px] font-bold flex-shrink-0"
                             style={{ background: avatarColor(c.id), fontFamily: 'var(--font-display)' }}>
                          {initials(c.name)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{c.name}</p>
                          <p className="text-[11px] text-slate-400">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{c.phone ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] font-semibold bg-blue-50 text-blue-700
                                       px-2 py-0.5 rounded-full">
                        {c._count?.parcels ?? 0} colis
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[11px] text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal message groupé */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center
                        justify-center z-50 p-4 animate-fadeIn"
             onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm
                          flex flex-col gap-5 animate-slideUp md:animate-fadeIn">
            <div className="flex items-center justify-between">
              <h2 style={{fontFamily:'var(--font-display)'}}
                  className="font-bold text-slate-900 text-base">Message groupé</h2>
              <button onClick={() => setShowModal(false)}
                      className="text-slate-300 hover:text-slate-500 transition-colors text-lg">✕</button>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm">
              Envoi à <span className="font-bold text-slate-900">{selected.size} client{selected.size > 1 ? 's' : ''}</span>.
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500
                                uppercase tracking-wide mb-2">Canal</label>
              <div className="flex gap-2">
                {CHANNELS.map(c => (
                  <button key={c.id} onClick={() => setChannel(c.id)}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold
                                      border-2 transition-all ${
                            channel === c.id
                              ? 'border-violet-500 text-violet-600 bg-violet-50'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500
                                uppercase tracking-wide mb-1.5">Message</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                        placeholder="Votre message…" rows={4}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl
                                   text-sm outline-none resize-none transition-all
                                   focus:border-violet-500 focus:ring-4 focus:ring-violet-100"/>
            </div>
            {sendBulk.isError && (
              <p className="text-xs text-red-500">{sendBulk.error?.message}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)}
                      className="flex-1 border-2 border-slate-200 text-slate-500
                                 py-3 rounded-xl text-sm font-semibold
                                 hover:border-slate-300 transition-colors">
                Annuler
              </button>
              <button onClick={handleSend}
                      disabled={!message.trim() || sendBulk.isPending}
                      className="flex-1 bg-violet-600 hover:bg-violet-700
                                 disabled:opacity-50 text-white font-semibold
                                 py-3 rounded-xl text-sm transition-colors
                                 flex items-center justify-center gap-2">
                {sendBulk.isPending ? <><Spinner size="sm" color="white"/> Envoi…</> : `Envoyer à ${selected.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}