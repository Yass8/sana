// src/pages/bags/BagDetailPage.jsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bagsApi } from '../../api/bags.api'
import StatusBadge from '../../components/ui/StatusBadge'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import Skeleton from '../../components/ui/Skeleton'
import LabelPrinter from '../../components/ui/LabelPrinter'
import { confirmDeleteAlert, showSuccessAlert, showErrorAlert } from '../../components/ui/SweetsAlert'
import { Copy, Download } from 'lucide-react'
import DeleteButton from '../../components/ui/DeleteButton'

export default function BagDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [alertMsg, setAlertMsg] = useState('')
  const [showAlert, setShowAlert] = useState(false)

  const { data: bag, isLoading } = useQuery({
    queryKey: ['bag', id],
    queryFn: () => bagsApi.getById(id),
  })

  // Mettre à jour localStorage quand airportDone change
  const closeBag = useMutation({
    mutationFn: () => bagsApi.close(id),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['bag', id] })
      queryClient.invalidateQueries({ queryKey: ['bags'] })
      await showSuccessAlert({ text: 'Sac fermé avec succès.' })
    },
    onError: async (err) => {
      await showErrorAlert({ text: err?.message || 'Impossible de fermer le sac.' })
    },
  })

  const sendAlert = useMutation({
    mutationFn: (message) => bagsApi.sendAlert(id, { message }),
    onSuccess: async () => {
      setShowAlert(false)
      setAlertMsg('')
      await showSuccessAlert({ text: `Message envoyé aux clients du sac.` })
    },
    onError: async (err) => {
      await showErrorAlert({ text: err?.message || 'Impossible d’envoyer l’alerte.' })
    },
  })

  const updateBagStatus = useMutation({
    mutationFn: ({ action }) => bagsApi.updateStatus(id, action),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['bag', id] })
      queryClient.invalidateQueries({ queryKey: ['bags'] })
      await showSuccessAlert({ text: data?.message || 'Statut du sac mis à jour.' })
    },
    onError: async (err) => {
      await showErrorAlert({ text: err?.message || 'Impossible de mettre à jour le statut.' })
    },
  })

  if (isLoading) return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5 animate-fadeIn">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Skeleton className="h-5 w-28" />
      </div>
      <Card>
        <div className="p-5 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Card>
      <Card>
        <div className="p-5 space-y-3">
          <Skeleton className="h-5 w-1/2 mx-auto" />
          <Skeleton className="h-40 mx-auto w-40" />
          <Skeleton className="h-5 w-40 mx-auto" />
        </div>
      </Card>
    </div>
  )

  const parcels = bag?.parcels ?? []
  const status = bag?.status

  // Déterminer quels boutons afficher selon la logique séquentielle
  const canClose = status === 'ouvert'
  const canMarkDepartAirport = status === 'fermé'
  const canMarkArrived = status === 'en_transit'
  const canAlert = ['fermé', 'en_transit', 'arrivé'].includes(status)

  const handleCloseBag = async () => {
    const confirmed = await confirmDeleteAlert({
      message: 'Voulez-vous vraiment fermer ce sac ? Cette action est définitive.',
      confirmButtonText: 'Fermer',
    })
    if (!confirmed) return
    closeBag.mutate()
  }

  const handleDepartAirport = async () => {
    updateBagStatus.mutate({ action: 'airport' })
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

      {/* Header sac */}
      <Card>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)' }}
                  className="text-2xl font-bold text-slate-900">{bag?.qrcode}</h1>
              <p className="text-xs text-slate-400 mt-1">
                {bag?.originAgency?.city} → {bag?.destinationAgency?.city}
                {bag?.weight ? ` · ${bag.weight} kg` : ''}
              </p>
            </div>
            <StatusBadge status={bag?.status} size="md" updatedAt={bag?.updatedAt} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { num: parcels.length, label: 'Colis' },
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
              <button onClick={handleCloseBag} disabled={closeBag.isPending || updateBagStatus.isPending}
                      className="w-full bg-[#0A1628] hover:bg-slate-800
                                 disabled:opacity-60 text-white font-semibold
                                 py-2.5 rounded-xl text-sm transition-colors
                                 flex items-center justify-center gap-2">
                {closeBag.isPending ? <><Spinner size="sm" color="white" /> Fermeture…</> : 'Fermer le sac'}
              </button>
            )}
            {canMarkDepartAirport && (
              <button onClick={handleDepartAirport}
                      disabled={updateBagStatus.isPending}
                      className="w-full bg-[#7C3AED] hover:bg-[#5B21B6]
                                 disabled:opacity-60 text-white font-semibold
                                 py-2.5 rounded-xl text-sm transition-colors">
                {updateBagStatus.isPending ? <><Spinner size="sm" color="white" /> Mise à jour…</> : 'Parti aéroport'}
              </button>
            )}
            {canMarkArrived && (
              <button onClick={() => updateBagStatus.mutate({ action: 'destination' })}
                      disabled={updateBagStatus.isPending}
                      className="w-full bg-[#34D399] hover:bg-[#059669]
                                 disabled:opacity-60 text-white font-semibold
                                 py-2.5 rounded-xl text-sm transition-colors">
                {updateBagStatus.isPending ? <><Spinner size="sm" color="white" /> Mise à jour…</> : 'Confirmé arrivé'}
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
              <LabelPrinter
                type="bag"
                code={bag.qrcode}
                qrcodeUrl={bag.qrcodeUrl}
                weight={bag.weight}
                destination={bag.destinationAgency?.city}
                className="w-full max-w-xs"
              />
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

      
      <div className="flex flex-wrap gap-4 bg-white border border-slate-100
                      rounded-2xl px-5 py-3.5 shadow-sm">
        <div className="mt-4 flex items-center gap-3">
            <button onClick={() => navigate(`/bags/${id}/edit`)}
                    className="text-xs bg-slate-50 border-2 border-slate-200
                               hover:border-violet-500 hover:text-violet-600
                               text-slate-500 px-3 py-1.5 rounded-xl
                               transition-all font-semibold flex items-center gap-1">
              <Copy size={14} /> Modifier
            </button>
            <DeleteButton type="bag" id={id} />

          </div>
      </div>

      {/* Liste colis */}
      <Card className='mb-10 md:mb-20 lg:mb-0'>
        <div className="flex items-center justify-between px-5 py-4
                        border-b border-slate-100">
          <h2 style={{ fontFamily: 'var(--font-display)' }}
              className="font-bold text-slate-900">Colis dans ce sac </h2>
          <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
            {parcels.length} colis {bag.weight ? ` | ${bag.weight} kg` : ''} 
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
                <StatusBadge status={p.status} updatedAt={p.updatedAt} />
              </div>
              <p className="text-xs text-slate-500">{p.sender?.name} → {p.recipientName}. <span className='text-black'>{p.weight ? `${p.weight} kg` : ''}</span></p>
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
                  <td className="px-5 py-3.5"><StatusBadge status={p.status} updatedAt={p.updatedAt} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}