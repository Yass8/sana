import { useState } from 'react'
import Spinner from '../ui/Spinner'

const CHANNELS = [
  { id: 'email', label: 'Email', disabled: false },
  { id: 'sms',   label: 'SMS',   disabled: true, tooltip: 'Bientôt disponible' },
  { id: 'both',  label: 'Les deux', disabled: true, tooltip: 'Bientôt disponible' },
]

export default function BulkMessageModal({ selected, sendBulk, onClose }) {
  const [channel, setChannel] = useState('email')
  const [message, setMessage] = useState('')

  const handleSend = async () => {
    if (!message.trim()) return
    await sendBulk.mutateAsync({ userIds: [...selected], channel, message })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center md:items-center justify-center z-50 p-4 animate-fadeIn lg:mb-0"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col gap-5 animate-slideUp md:animate-fadeIn">
        <div className="flex items-center justify-between">
          <h2 style={{ fontFamily: 'var(--font-display)' }} className="font-bold text-slate-900 text-base">Message groupé</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500 text-lg">✕</button>
        </div>
        <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm">
          Envoi à <span className="font-bold text-slate-900">{selected.size} client{selected.size > 1 ? 's' : ''}</span>.
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Canal</label>
          <div className="flex gap-2">
            {CHANNELS.map(c => (
              <button
                key={c.id}
                onClick={() => !c.disabled && setChannel(c.id)}
                disabled={c.disabled}
                title={c.tooltip || ''}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                  channel === c.id
                    ? 'border-violet-500 text-violet-600 bg-violet-50'
                    : c.disabled
                    ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)}
                    placeholder="Votre message…" rows={4}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none resize-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-100"/>
        </div>
        {sendBulk.isError && <p className="text-xs text-red-500">{sendBulk.error?.message}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border-2 border-slate-200 text-slate-500 py-3 rounded-xl text-sm font-semibold hover:border-slate-300">Annuler</button>
          <button onClick={handleSend} disabled={!message.trim() || sendBulk.isPending}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
            {sendBulk.isPending ? <><Spinner size="sm" color="white"/> Envoi…</> : `Envoyer à ${selected.size}`}
          </button>
        </div>
      </div>
    </div>
  )
}