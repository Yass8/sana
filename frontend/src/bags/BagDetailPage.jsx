// src/pages/bags/BagDetailPage.jsx
import { useState }    from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bagsApi }     from '../../api/bags.api'
import StatusBadge     from '../../components/ui/StatusBadge'

export default function BagDetailPage() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const queryClient = useQueryClient()

  const [alertMsg,      setAlertMsg]      = useState('')
  const [showAlert,     setShowAlert]     = useState(false)
  const [alertSent,     setAlertSent]     = useState(false)

  const { data: bag, isLoading } = useQuery({
    queryKey: ['bag', id],
    queryFn:  () => bagsApi.getById(id),
  })

  // Fermer le sac
  const closeBag = useMutation({
    mutationFn: () => bagsApi.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bag', id] })
      queryClient.invalidateQueries({ queryKey: ['bags'] })
    },
  })

  // Envoi groupé à tous les clients du sac
  const sendAlert = useMutation({
    mutationFn: (message) => bagsApi.sendAlert(id, { message }),
    onSuccess: () => {
      setAlertSent(true)
      setShowAlert(false)
      setAlertMsg('')
      setTimeout(() => setAlertSent(false), 4000)
    },
  })

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-6 h-6 border-2 border-[#E8673C]
                      border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const parcels   = bag?.parcels ?? []
  const canClose  = bag?.status === 'open' && parcels.length > 0
  const canAlert  = ['closed','in_transit'].includes(bag?.status)
  const clientCount = parcels.filter(p => p.sender?.email).length

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <button onClick={() => navigate('/bags')}
                className="hover:text-[#E8673C] transition-colors">
          Sacs
        </button>
        <span>/</span>
        <span style={{fontFamily:'var(--font-display)'}}
              className="text-[#E8673C] font-semibold">
          {bag?.barcode}
        </span>
      </div>

      {/* Toast alert envoyé */}
      {alertSent && (
        <div className="bg-emerald-50 border border-emerald-200
                        text-emerald-700 text-sm px-4 py-3 rounded-xl
                        flex items-center gap-2">
          <span>✓</span>
          Message envoyé à {clientCount} client(s).
        </div>
      )}

      {/* Header sac */}
      <div className="bg-white border border-slate-100 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 style={{fontFamily:'var(--font-display)'}}
                className="text-2xl font-bold text-[#0F1923]">
              {bag?.barcode}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {bag?.shipment?.originAgency?.city} →{' '}
              {bag?.shipment?.destinationAgency?.city}
              {bag?.weight ? ` · ${bag.weight} kg total` : ''}
            </p>
          </div>
          <StatusBadge status={bag?.status} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Colis',    value: parcels.length },
            { label: 'Envoi',    value: bag?.shipment?.reference ?? '—' },
            { label: 'Créé le',  value: new Date(bag?.createdAt)
                .toLocaleDateString('fr-FR',
                  { day:'numeric', month:'short' }) },
          ].map(({ label, value }) => (
            <div key={label}
                 className="bg-slate-50 rounded-lg px-4 py-3 text-center">
              <p style={{fontFamily:'var(--font-display)'}}
                 className="text-xl font-bold text-[#0F1923]">{value}</p>
              <p className="text-[10px] text-slate-400 uppercase
                            tracking-wide mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Actions sac */}
        <div className="flex gap-3 mt-5">
          {canClose && (
            <button
              onClick={() => closeBag.mutate()}
              disabled={closeBag.isPending}
              className="flex-1 bg-[#0F1923] hover:bg-[#1A2736]
                         disabled:opacity-60 text-white font-medium
                         text-sm py-2.5 rounded-lg transition-colors"
            >
              {closeBag.isPending ? 'Fermeture…' : 'Fermer le sac'}
            </button>
          )}
          {canAlert && (
            <button
              onClick={() => setShowAlert(v => !v)}
              className="flex-1 border border-red-200 text-red-600
                         hover:bg-red-50 font-medium text-sm py-2.5
                         rounded-lg transition-colors"
            >
              Envoyer une alerte groupée
            </button>
          )}
        </div>

        {/* Formulaire alerte */}
        {showAlert && (
          <div className="mt-4 p-4 bg-red-50 border border-red-100
                          rounded-xl flex flex-col gap-3">
            <p className="text-xs font-medium text-red-700">
              Ce message sera envoyé par email et SMS
              à tous les {clientCount} clients de ce sac.
            </p>
            <textarea
              value={alertMsg}
              onChange={e => setAlertMsg(e.target.value)}
              placeholder="Ex: Retard douanier sur votre envoi…"
              rows={3}
              className="w-full px-3 py-2.5 border-[1.5px]
                         border-red-200 rounded-lg text-sm
                         outline-none resize-none bg-white
                         focus:border-red-400 transition-all"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowAlert(false)}
                className="flex-1 border border-slate-200 text-slate-500
                           py-2 rounded-lg text-sm transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => alertMsg.trim() && sendAlert.mutate(alertMsg)}
                disabled={!alertMsg.trim() || sendAlert.isPending}
                className="flex-1 bg-red-500 hover:bg-red-600
                           disabled:opacity-50 text-white py-2
                           rounded-lg text-sm font-medium
                           transition-colors"
              >
                {sendAlert.isPending
                  ? 'Envoi…'
                  : `Envoyer à ${clientCount} clients`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Liste colis dans le sac */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50">
          <h2 style={{fontFamily:'var(--font-display)'}}
              className="text-sm font-bold text-[#0F1923]">
            Colis dans ce sac ({parcels.length})
          </h2>
        </div>

        {parcels.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-10">
            Aucun colis dans ce sac.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Code','Expéditeur','Destinataire','Statut'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold
                                         text-slate-400 uppercase tracking-wide
                                         px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parcels.map(p => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/parcels/${p.id}`)}
                  className="border-b border-slate-50 hover:bg-[#FDF8F6]
                             cursor-pointer transition-colors last:border-0"
                >
                  <td className="px-5 py-3">
                    <span style={{fontFamily:'var(--font-display)'}}
                          className="text-xs font-semibold text-[#E8673C]">
                      {p.barcode}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600 text-xs">
                    {p.sender?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-slate-600 text-xs">
                    {p.recipientName}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}