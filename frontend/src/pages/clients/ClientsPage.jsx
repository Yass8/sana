// src/pages/clients/ClientsPage.jsx
import { useState, useMemo }  from 'react'
import { useClients, useSendBulkMessage } from '../../hooks/useClients'

const CHANNELS = [
  { id: 'email', label: 'Email' },
  { id: 'sms',   label: 'SMS'   },
  { id: 'both',  label: 'Les deux' },
]

// Couleurs avatar déterministes
const AVATAR_COLORS = ['#E8673C','#1D9E75','#378ADD','#7F77DD','#D85A30']
const avatarColor   = (id) => AVATAR_COLORS[parseInt(id, 16) % AVATAR_COLORS.length]
const initials      = (name) => name.split(' ').slice(0,2)
                                  .map(w => w[0]).join('').toUpperCase()

export default function ClientsPage() {
  const [search,    setSearch]    = useState('')
  const [selected,  setSelected]  = useState(new Set())
  const [showModal, setShowModal] = useState(false)
  const [channel,   setChannel]   = useState('email')
  const [message,   setMessage]   = useState('')

  const clients  = useClients(search)
  const sendBulk = useSendBulkMessage()

  const data = Array.isArray(clients.data) ? clients.data : (clients.data?.rows ?? [])

  // ── Sélection ─────────────────────────────────────────
  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = (checked) => {
    setSelected(checked ? new Set(data.map(c => c.id)) : new Set())
  }

  const allChecked = data.length > 0 && data.every(c => selected.has(c.id))

  // ── Envoi groupé ──────────────────────────────────────
  const handleSend = async () => {
    if (!message.trim()) return
    await sendBulk.mutateAsync({
      userIds: [...selected],
      channel,
      message,
    })
    setShowModal(false)
    setMessage('')
    setSelected(new Set())
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{fontFamily:'var(--font-display)'}}
              className="text-xl font-bold text-[#0F1923]">
            Clients
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {data.length} client{data.length > 1 ? 's' : ''} enregistré{data.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={selected.size === 0}
          className="flex items-center gap-2 bg-[#0F1923] hover:bg-[#1A2736]
                     disabled:opacity-40 disabled:cursor-not-allowed
                     text-white text-sm font-medium px-4 py-2.5
                     rounded-lg transition-all"
        >
          Envoyer un message groupé
          {selected.size > 0 && (
            <span className="bg-[#E8673C] text-white text-[10px]
                             font-bold px-1.5 py-0.5 rounded-full">
              {selected.size}
            </span>
          )}
        </button>
      </div>

      {/* ── Barre de recherche ────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border-[1.5px]
                        border-slate-200 rounded-lg px-3 py-2
                        focus-within:border-[#E8673C] transition-all flex-1
                        min-w-[200px]">
          <span className="text-slate-300 text-sm">⌕</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="flex-1 text-sm outline-none bg-transparent
                       text-[#0F1923] placeholder-slate-300"
          />
        </div>
        {selected.size > 0 && (
          <span className="text-xs text-[#E8673C] font-medium
                           bg-[#FDF0EB] px-3 py-1.5 rounded-lg">
            {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────── */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
        {clients.isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#E8673C]
                            border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={e => toggleAll(e.target.checked)}
                      className="accent-[#E8673C] w-3.5 h-3.5 cursor-pointer"
                    />
                  </th>
                  {['Client','Téléphone','Colis','Inscrit le'].map(h => (
                    <th key={h}
                        className="text-left text-[10px] font-semibold
                                   text-slate-400 uppercase tracking-wide
                                   px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(client => (
                  <tr
                    key={client.id}
                    onClick={() => toggleOne(client.id)}
                    className={`border-b border-slate-50 cursor-pointer
                               transition-colors last:border-0 ${
                      selected.has(client.id)
                        ? 'bg-[#FEF9F7]'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(client.id)}
                        onChange={() => toggleOne(client.id)}
                        className="accent-[#E8673C] w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>

                    {/* Identité */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 rounded-full flex items-center
                                     justify-content center text-white
                                     text-[10px] font-bold flex-shrink-0"
                          style={{
                            backgroundColor: avatarColor(client.id),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: 'var(--font-display)',
                          }}
                        >
                          {initials(client.name)}
                        </div>
                        <div>
                          <p className="font-medium text-[#0F1923] text-xs">
                            {client.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {client.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Téléphone */}
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {client.phone ?? '—'}
                    </td>

                    {/* Nb colis */}
                    <td className="px-4 py-3">
                      <span className="bg-blue-50 text-blue-700 text-[10px]
                                       font-medium px-2 py-0.5 rounded-full">
                        {client._count?.parcels ?? 0} colis
                      </span>
                    </td>

                    {/* Date inscription */}
                    <td className="px-4 py-3 text-[11px] text-slate-400">
                      {new Date(client.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}

                {data.length === 0 && (
                  <tr>
                    <td colSpan="5"
                        className="text-center py-14 text-sm text-slate-400">
                      Aucun client trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal message groupé ──────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center
                     justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm
                          flex flex-col gap-5">

            {/* Header modal */}
            <div className="flex items-center justify-between">
              <h2 style={{fontFamily:'var(--font-display)'}}
                  className="text-base font-bold text-[#0F1923]">
                Message groupé
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-300 hover:text-slate-500
                           transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Récap destinataires */}
            <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm">
              Envoi à{' '}
              <span className="font-semibold text-[#0F1923]">
                {selected.size} client{selected.size > 1 ? 's' : ''}
              </span>{' '}
              sélectionné{selected.size > 1 ? 's' : ''}.
            </div>

            {/* Choix du canal */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-slate-500
                                uppercase tracking-wide">
                Canal d'envoi
              </label>
              <div className="flex gap-2">
                {CHANNELS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setChannel(c.id)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium
                               border transition-all ${
                      channel === c.id
                        ? 'border-[#E8673C] text-[#E8673C] bg-[#FDF0EB]'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Texte du message */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-slate-500
                                uppercase tracking-wide">
                Message
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Votre message aux clients sélectionnés…"
                rows={4}
                className="w-full px-3 py-2.5 border-[1.5px] border-slate-200
                           rounded-lg text-sm outline-none resize-none
                           focus:border-[#E8673C] focus:ring-2
                           focus:ring-[#E8673C]/10 transition-all"
              />
            </div>

            {/* Erreur API */}
            {sendBulk.isError && (
              <p className="text-xs text-red-500">
                {sendBulk.error?.message ?? 'Erreur lors de l\'envoi.'}
              </p>
            )}

            {/* Boutons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-200 text-slate-500
                           py-2.5 rounded-lg text-sm transition-colors
                           hover:border-slate-300"
              >
                Annuler
              </button>
              <button
                onClick={handleSend}
                disabled={!message.trim() || sendBulk.isPending}
                className="flex-1 bg-[#E8673C] hover:bg-[#D45A30]
                           disabled:opacity-50 disabled:cursor-not-allowed
                           text-white font-medium text-sm py-2.5
                           rounded-lg transition-colors"
              >
                {sendBulk.isPending
                  ? 'Envoi…'
                  : `Envoyer à ${selected.size}`}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}