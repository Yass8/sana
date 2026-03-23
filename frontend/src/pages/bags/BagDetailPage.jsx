// src/pages/bags/BagDetailPage.jsx
import { useState }          from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bagsApi }           from '../../api/bags.api'
import StatusBadge           from '../../components/ui/StatusBadge'
import Card                  from '../../components/ui/Card'
import Spinner               from '../../components/ui/Spinner'

export default function BagDetailPage() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const [alertMsg,  setAlertMsg]  = useState('')
  const [showAlert, setShowAlert] = useState(false)
  const [toasted,   setToasted]   = useState('')

  const { data: bag, isLoading } = useQuery({
    queryKey: ['bag', id],
    queryFn:  () => bagsApi.getById(id),
  })

  const closeBag = useMutation({
    mutationFn: () => bagsApi.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bag', id] })
      queryClient.invalidateQueries({ queryKey: ['bags'] })
      setToasted('Sac fermé avec succès.')
      setTimeout(() => setToasted(''), 3000)
    },
  })

  const sendAlert = useMutation({
    mutationFn: (message) => bagsApi.sendAlert(id, { message }),
    onSuccess: () => {
      setShowAlert(false); setAlertMsg('')
      setToasted(`Message envoyé aux clients du sac.`)
      setTimeout(() => setToasted(''), 3000)
    },
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg"/></div>

  const parcels     = bag?.parcels ?? []
  const canClose    = bag?.status === 'open'
  const canAlert    = ['closed','in_transit'].includes(bag?.status)

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5 animate-fadeIn">

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <button onClick={() => navigate('/bags')}
                className="hover:text-violet-600 transition-colors">Sacs</button>
        <span>/</span>
        <span style={{fontFamily:'var(--font-display)'}}
              className="text-violet-600 font-bold">{bag?.barcode}</span>
      </div>

      {toasted && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700
                        text-sm px-4 py-3 rounded-xl animate-fadeIn">
          ✅ {toasted}
        </div>
      )}

      {/* Header sac */}
      <Card>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 style={{fontFamily:'var(--font-display)'}}
                  className="text-2xl font-bold text-slate-900">{bag?.barcode}</h1>
              <p className="text-xs text-slate-400 mt-1">
                {bag?.shipment?.originAgency?.city} → {bag?.shipment?.destinationAgency?.city}
                {bag?.weight ? ` · ${bag.weight} kg` : ''}
              </p>
            </div>
            <StatusBadge status={bag?.status} size="md"/>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { num: parcels.length,              label: 'Colis'  },
              { num: bag?.shipment?.reference,    label: 'Envoi'  },
              { num: new Date(bag?.createdAt).toLocaleDateString('fr-FR', { day:'numeric', month:'short' }), label: 'Créé le' },
            ].map(({ num, label }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                <p style={{fontFamily:'var(--font-display)'}}
                   className="text-base font-bold text-slate-900 truncate">{num}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {canClose && (
              <button onClick={() => closeBag.mutate()} disabled={closeBag.isPending}
                      className="flex-1 bg-[#0A1628] hover:bg-slate-800
                                 disabled:opacity-60 text-white font-semibold
                                 py-2.5 rounded-xl text-sm transition-colors
                                 flex items-center justify-center gap-2">
                {closeBag.isPending ? <><Spinner size="sm" color="white"/> Fermeture…</> : 'Fermer le sac'}
              </button>
            )}
            {canAlert && (
              <button onClick={() => setShowAlert(v => !v)}
                      className="flex-1 border-2 border-red-200 text-red-600
                                 hover:bg-red-50 font-semibold py-2.5 rounded-xl
                                 text-sm transition-colors">
                Alerte groupée
              </button>
            )}
          </div>

          {/* Formulaire alerte */}
          {showAlert && (
            <div className="mt-4 bg-red-50 border border-red-200
                            rounded-xl p-4 flex flex-col gap-3 animate-fadeIn">
              <p className="text-xs font-semibold text-red-700">
                Message envoyé par email et SMS aux {parcels.length} clients de ce sac.
              </p>
              <textarea value={alertMsg} onChange={e => setAlertMsg(e.target.value)}
                        placeholder="Ex: Retard douanier…" rows={3}
                        className="w-full px-3 py-2.5 border-2 border-red-200
                                   rounded-xl text-sm outline-none resize-none
                                   bg-white focus:border-red-400 transition-all"/>
              <div className="flex gap-2">
                <button onClick={() => setShowAlert(false)}
                        className="flex-1 border-2 border-slate-200 text-slate-500
                                   py-2 rounded-xl text-sm font-semibold transition-colors">
                  Annuler
                </button>
                <button onClick={() => alertMsg.trim() && sendAlert.mutate(alertMsg)}
                        disabled={!alertMsg.trim() || sendAlert.isPending}
                        className="flex-1 bg-red-500 hover:bg-red-600
                                   disabled:opacity-50 text-white font-semibold
                                   py-2 rounded-xl text-sm transition-colors
                                   flex items-center justify-center gap-2">
                  {sendAlert.isPending ? <><Spinner size="sm" color="white"/> Envoi…</> : `Envoyer à ${parcels.length} clients`}
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Bandeau infos envoi */}
      <div className="flex flex-wrap gap-4 bg-white border border-slate-100
                      rounded-2xl px-5 py-3.5 shadow-sm">
        {[
          { label: 'Envoi',       value: bag?.shipment?.reference },
          { label: 'Destination', value: bag?.shipment?.destinationAgency?.city },
          { label: 'Départ',      value: bag?.shipment?.departureDate
              ? new Date(bag.shipment.departureDate).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })
              : '—' },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{value ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Liste colis */}
      <Card>
        <div className="flex items-center justify-between px-5 py-4
                        border-b border-slate-100">
          <h2 style={{fontFamily:'var(--font-display)'}}
              className="font-bold text-slate-900">Colis dans ce sac</h2>
          <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
            {parcels.length} colis
          </span>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-slate-100">
          {parcels.map(p => (
            <div key={p.id} onClick={() => navigate(`/parcels/${p.id}`)}
                 className="px-4 py-3.5 cursor-pointer hover:bg-violet-50/50 transition-colors">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p style={{fontFamily:'var(--font-display)'}}
                   className="text-sm font-bold text-violet-600">{p.barcode}</p>
                <StatusBadge status={p.status}/>
              </div>
              <p className="text-xs text-slate-500">{p.sender?.name} → {p.recipientName}</p>
            </div>
          ))}
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Code','Expéditeur','Destinataire','Poids','Statut'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-slate-400
                                         uppercase tracking-wide px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parcels.map(p => (
                <tr key={p.id} onClick={() => navigate(`/parcels/${p.id}`)}
                    className="border-b border-slate-50 hover:bg-violet-50/50
                               cursor-pointer transition-colors last:border-0">
                  <td className="px-5 py-3.5">
                    <span style={{fontFamily:'var(--font-display)'}}
                          className="text-xs font-bold text-violet-600">{p.barcode}</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 text-xs">{p.sender?.name ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-600 text-xs">{p.recipientName}</td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">
                    {p.weight ? `${p.weight} kg` : '—'}
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