// src/pages/bags/BagDetailPage.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bagsApi } from '../../api/bags.api'
import StatusBadge from '../../components/ui/StatusBadge'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import { Download } from 'lucide-react'

export default function BagDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [alertMsg, setAlertMsg] = useState('')
  const [showAlert, setShowAlert] = useState(false)
  const [toasted, setToasted] = useState('')
  const [airportDone, setAirportDone] = useState(() => {
    // récupérer l'état depuis localStorage (clé unique par sac)
    const saved = localStorage.getItem(`bag_airport_${id}`)
    return saved === 'true'
  })

  const { data: bag, isLoading } = useQuery({
    queryKey: ['bag', id],
    queryFn: () => bagsApi.getById(id),
  })

  // Mettre à jour localStorage quand airportDone change
  useEffect(() => {
    localStorage.setItem(`bag_airport_${id}`, airportDone)
  }, [id, airportDone])

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
      setShowAlert(false)
      setAlertMsg('')
      setToasted(`Message envoyé aux clients du sac.`)
      setTimeout(() => setToasted(''), 3000)
    },
  })

  const updateBagStatus = useMutation({
    mutationFn: ({ action }) => bagsApi.updateStatus(id, action),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bag', id] })
      queryClient.invalidateQueries({ queryKey: ['bags'] })
      setToasted(data?.message || 'Statut du sac mis à jour.')
      setTimeout(() => setToasted(''), 3000)
    },
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const parcels = bag?.parcels ?? []
  const status = bag?.status

  // Déterminer quels boutons afficher selon la logique séquentielle
  const canClose = status === 'open'
  const canMarkDepartAgency = status === 'closed'
  const canMarkDepartAirport = status === 'in_transit' && !airportDone
  const canMarkArrived = status === 'in_transit' && airportDone
  const canAlert = ['closed', 'in_transit', 'arrived'].includes(status)

  const handleDepartAirport = () => {
    // Simuler l'étape aéroport sans changer le statut
    // Si l'API supporte une action 'airport', on pourrait l'appeler ici
    setAirportDone(true)
    setToasted('Étape "Parti aéroport" enregistrée.')
    setTimeout(() => setToasted(''), 3000)
    // On invalide la query pour rafraîchir les données (si l'API a modifié quelque chose)
    queryClient.invalidateQueries({ queryKey: ['bag', id] })
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5 animate-fadeIn">

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <button onClick={() => navigate('/bags')}
                className="hover:text-violet-600 transition-colors">Sacs</button>
        <span>/</span>
        <span style={{ fontFamily: 'var(--font-display)' }}
              className="text-violet-600 font-bold">{bag?.qrcode}</span>
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
              <h1 style={{ fontFamily: 'var(--font-display)' }}
                  className="text-2xl font-bold text-slate-900">{bag?.qrcode}</h1>
              <p className="text-xs text-slate-400 mt-1">
                {bag?.shipment?.originAgency?.city} → {bag?.shipment?.destinationAgency?.city}
                {bag?.weight ? ` · ${bag.weight} kg` : ''}
              </p>
            </div>
            <StatusBadge status={bag?.status} size="md" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { num: parcels.length, label: 'Colis' },
              { num: bag?.shipment?.reference, label: 'Envoi' },
              {
                num: new Date(bag?.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                label: 'Créé le'
              },
            ].map(({ num, label }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                <p style={{ fontFamily: 'var(--font-display)' }}
                   className="text-base font-bold text-slate-900 truncate">{num}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 gap-3 mt-5">
            {canClose && (
              <button onClick={() => closeBag.mutate()} disabled={closeBag.isPending || updateBagStatus.isPending}
                      className="w-full bg-[#0A1628] hover:bg-slate-800
                                 disabled:opacity-60 text-white font-semibold
                                 py-2.5 rounded-xl text-sm transition-colors
                                 flex items-center justify-center gap-2">
                {closeBag.isPending ? <><Spinner size="sm" color="white" /> Fermeture…</> : 'Fermer le sac'}
              </button>
            )}
            {canMarkDepartAgency && (
              <button onClick={() => updateBagStatus.mutate({ action: 'agency' })}
                      disabled={updateBagStatus.isPending}
                      className="w-full bg-[#7C3AED] hover:bg-[#5B21B6]
                                 disabled:opacity-60 text-white font-semibold
                                 py-2.5 rounded-xl text-sm transition-colors">
                {updateBagStatus.isPending ? <><Spinner size="sm" color="white" /> Mise à jour…</> : 'Parti agence'}
              </button>
            )}
            {canMarkDepartAirport && (
              <button onClick={handleDepartAirport}
                      disabled={updateBagStatus.isPending}
                      className="w-full bg-[#7C3AED] hover:bg-[#5B21B6]
                                 disabled:opacity-60 text-white font-semibold
                                 py-2.5 rounded-xl text-sm transition-colors">
                Parti aéroport
              </button>
            )}
            {canMarkArrived && (
              <button onClick={() => updateBagStatus.mutate({ action: 'destination' })}
                      disabled={updateBagStatus.isPending}
                      className="w-full bg-[#34D399] hover:bg-[#059669]
                                 disabled:opacity-60 text-white font-semibold
                                 py-2.5 rounded-xl text-sm transition-colors">
                {updateBagStatus.isPending ? <><Spinner size="sm" color="white" /> Mise à jour…</> : 'Arrivé destination'}
              </button>
            )}
            {canAlert && (
              <button onClick={() => setShowAlert(v => !v)}
                      className="w-full border-2 border-red-200 text-red-600
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
                                   bg-white focus:border-red-400 transition-all" />
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
                  {sendAlert.isPending ? <><Spinner size="sm" color="white" /> Envoi…</> : `Envoyer à ${parcels.length} clients`}
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* QR Code */}
      <Card>
        <div className='flex-col justify-center p-5'>
          <h2 style={{ fontFamily: 'var(--font-display)' }}
              className="font-bold text-slate-900 mb-4 text-center">QR Code du sac : {bag.qrcode}</h2>
          {bag.qrcodeUrl ? (
            <div className="flex flex-col items-center gap-3">
              <img src={bag.qrcodeUrl} alt={bag.qrcode}
                   className="w-40 h-40" />
              <p className="text-[10px] text-slate-400 text-center">
                Scannez pour avoir les détails de ce sac
              </p>
              <a href={bag.qrcodeUrl} download={`${bag.qrcode}.png`}
                 className="text-xs text-violet-600 hover:underline font-semibold flex items-center gap-1">
                <Download size={14} /> Télécharger PNG
              </a>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">
              QR code non disponible.
            </p>
          )}
        </div>
      </Card>

      {/* Bandeau envoi */}
      <div className="flex flex-wrap gap-4 bg-white border border-slate-100
                      rounded-2xl px-5 py-3.5 shadow-sm">
        {[
          { label: 'Envoi', value: bag?.shipment?.reference },
          { label: 'Destination', value: bag?.shipment?.destinationAgency?.city },
          {
            label: 'Départ', value: bag?.shipment?.departureDate
              ? new Date(bag.shipment.departureDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
              : '—'
          },
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
          <h2 style={{ fontFamily: 'var(--font-display)' }}
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
                <p style={{ fontFamily: 'var(--font-display)' }}
                   className="text-sm font-bold text-violet-600">{p.qrcode}</p>
                <StatusBadge status={p.status} />
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
                {['Code', 'Expéditeur', 'Destinataire', 'Poids', 'Statut'].map(h => (
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
                    <span style={{ fontFamily: 'var(--font-display)' }}
                          className="text-xs font-bold text-violet-600">{p.qrcode}</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 text-xs">{p.sender?.name ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-600 text-xs">{p.recipientName}</td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">
                    {p.weight ? `${p.weight} kg` : '—'}
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}