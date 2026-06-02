// src/pages/parcels/ParcelDetailPage.jsx
import { useState }           from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth }            from '../../context/AuthContext'
import { useParcel, useUpdateParcelStatus } from '../../hooks/useParcels'
import TrackingTimeline       from '../../components/ui/TrackingTimeline'
import StatusBadge            from '../../components/ui/StatusBadge'
import Card                   from '../../components/ui/Card'
import Spinner                from '../../components/ui/Spinner'
import Skeleton               from '../../components/ui/Skeleton'
import LabelPrinter           from '../../components/ui/LabelPrinter'
import { confirmActionAlert, showSuccessAlert, showErrorAlert } from '../../components/ui/SweetsAlert'
// Import des icônes Lucide
import { ArrowLeft, Plus, ChevronUp, Copy, Download, Trash2 } from 'lucide-react'
import DeleteButton from '../../components/ui/DeleteButton'

const NEXT_STATUS = {
  agent_fr: { received: 'departed_agency', departed_agency: 'departed_airport' },
  agent_af: { departed_airport: 'arrived_destination', arrived_destination: 'collected' },
  admin:    { received: 'departed_agency', departed_agency: 'departed_airport',
              departed_airport: 'arrived_destination', arrived_destination: 'collected' },
}
const NEXT_LABEL = {
  departed_agency: 'Confirmer départ agence',
  departed_airport: 'Confirmer embarquement',
  arrived_destination: 'Confirmer arrivée',
  collected: 'Confirmer retrait',
}

export default function ParcelDetailPage() {
  const { id }       = useParams()
  const { user }     = useAuth()
  const navigate     = useNavigate()
  const updateStatus = useUpdateParcelStatus()
  const [notes,      setNotes]     = useState('')
  const [showNotes,  setShowNotes] = useState(false)

  const { data: parcel, isLoading, isError } = useParcel(id)
  const nextStatus = NEXT_STATUS[user?.role]?.[parcel?.status]

  const handleUpdate = async () => {
    if (!nextStatus) return

    const confirmed = await confirmActionAlert({
      message: 'Voulez-vous vraiment appliquer cette étape au colis ?'
    })
    if (!confirmed) return

    try {
      await updateStatus.mutateAsync({ id, status: nextStatus, notes: notes || undefined })
      setNotes('')
      setShowNotes(false)
      await showSuccessAlert({ text: 'Statut du colis mis à jour avec succès.' })
    } catch (err) {
      await showErrorAlert({ text: err?.message || 'Impossible de mettre à jour le statut.' })
    }
  }

  if (isLoading) return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5 animate-fadeIn">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Skeleton className="h-5 w-28" />
      </div>

      <Card>
        <div className="p-5 space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-5 space-y-3">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <div className="p-5 space-y-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        </Card>
        <Card>
          <div className="p-5 space-y-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-40 mx-auto w-40" />
          </div>
        </Card>
      </div>
    </div>
  )
  if (isError)   return (
    <div className="text-center py-20">
      <p className="text-slate-400 text-sm mb-4">Colis introuvable.</p>
      <button onClick={() => navigate('/parcels')}
              className="text-violet-600 text-sm hover:underline flex items-center justify-center gap-1 mx-auto">
        <ArrowLeft size={14} /> Retour
      </button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5 animate-fadeIn">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <button onClick={() => navigate('/parcels')}
                className="hover:text-violet-600 transition-colors">Colis</button>
        <span>/</span>
        <span style={{fontFamily:'var(--font-display)'}}
              className="text-violet-600 font-bold">{parcel.qrcode}</span>
      </div>

      {/* Header */}
      <Card>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h1 style={{fontFamily:'var(--font-display)'}}
                  className=" font-bold text-slate-900">{parcel.qrcode}</h1>
              <p className="text-xs text-slate-400 mt-1">
                Déposé le {new Date(parcel.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
                {parcel.weight ? ` · ${parcel.weight} kg` : ''}
              </p>
            </div>
            <StatusBadge status={parcel.status} size="md" updatedAt={parcel.updatedAt} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { label: 'Expéditeur',   value: parcel.sender?.name },
              { label: 'Destinataire', value: parcel.recipientName },
              { label: 'Email exp.',  value: parcel.sender?.email ?? '—' },
              { label: 'Email dest.',  value: parcel.recipientEmail ?? '—' },
              { label: 'Tél. exp.',   value: parcel.sender.phone ?? '—' },
              { label: 'Tél. dest.',   value: parcel.recipientPhone ?? '—' },
              { label: 'Sac',          value: parcel.bag?.qrcode ?? '—' },
              { label: 'Destination',  value: parcel.bag?.destinationAgency?.city ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-xl px-0 lg:px-1 py-1 lg:py-2.5">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                <p className="text-xs lg:text-sm text-slate-800 font-semibold mt-0.5 truncate">{value}</p>
              </div>
            ))}
          </div>

          {parcel.description && (
            <div className="mt-2 bg-slate-50 rounded-xl px-0 lg:px-3 py-2.5">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Contenu</p>
              <p className="text-xs lg:text-sm text-slate-700 mt-0.5">{parcel.description}</p>
            </div>
          )}
          {/* Bouton modifier et supprimer en sm */}
          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => navigate(`/parcels/${id}/edit`)}
                    className="text-xs bg-slate-50 border-2 border-slate-200
                               hover:border-violet-500 hover:text-violet-600
                               text-slate-500 px-3 py-1.5 rounded-xl
                               transition-all font-semibold flex items-center gap-1">
              <Copy size={14} /> Modifier
            </button>
            <DeleteButton type="parcel" id={id} />

          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10 md:mb-24 lg:mb-0">

        {/* Timeline */}
        <Card>
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 style={{fontFamily:'var(--font-display)'}}
                className="font-bold text-slate-900">Suivi du colis</h2>
          </div>
          <div className="p-5">
            <TrackingTimeline
              events={parcel.trackingEvents ?? []}
              currentStatus={parcel.status}
            />
          </div>
        </Card>

        <div className="flex flex-col gap-4">

          {/* Action */}
          {nextStatus && (
            <Card>
              <div className="p-5">
                <h2 style={{fontFamily:'var(--font-display)'}}
                    className="font-bold text-slate-900 mb-4">Prochaine étape</h2>
                <button onClick={handleUpdate} disabled={updateStatus.isPending}
                        className="w-full bg-violet-600 hover:bg-violet-700
                                   disabled:opacity-60 text-white font-semibold
                                   py-3 rounded-xl text-sm transition-colors
                                   flex items-center justify-center gap-2 mb-3">
                  {updateStatus.isPending
                    ? <><Spinner size="sm" color="white"/> Mise à jour…</>
                    : NEXT_LABEL[nextStatus]}
                </button>
                <button onClick={() => setShowNotes(v => !v)}
                        className="text-xs text-slate-400 hover:text-slate-600
                                   transition-colors w-full text-center flex items-center justify-center gap-1">
                  {showNotes ? <><ChevronUp size={14}/> Masquer les notes</> : <><Plus size={14}/> Ajouter une note</>}
                </button>
                {showNotes && (
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                            placeholder="Notes pour cette étape…" rows={2}
                            className="mt-3 w-full px-3 py-2.5 border-2 border-slate-200
                                       rounded-xl text-sm outline-none resize-none
                                       focus:border-violet-500 transition-all"/>
                )}
              </div>
            </Card>
          )}

          {/* QR Code */}
          <Card>
            <div className="p-5">
              <h2 style={{fontFamily:'var(--font-display)'}}
                  className="font-bold text-slate-900 mb-4">QR Code</h2>
              {parcel.qrcodeUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <img src={parcel.qrcodeUrl} alt={parcel.qrcode}
                       className="w-40 h-40"/>
                  <LabelPrinter
                    type="parcel"
                    code={parcel.qrcode}
                    qrcodeUrl={parcel.qrcodeUrl}
                    weight={parcel.weight}
                    destination={parcel.bag?.destinationAgency?.city}
                    className="w-full max-w-xs"
                  />
                  <p className="text-[10px] text-slate-400 text-center">
                    Scannez pour suivre ce colis
                  </p>
                  <a href={parcel.qrcodeUrl} download={`${parcel.qrcode}.png`}
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

          {/* Lien suivi public */}
          <Card>
            <div className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-800">Lien de suivi</p>
                <p className="text-[10px] text-slate-400 mt-0.5">À partager avec le client</p>
              </div>
              <button onClick={() => navigator.clipboard?.writeText(
                        `${window.location.origin}/track/${parcel.qrcode}`
                      )}
                      className="text-xs bg-slate-50 border-2 border-slate-200
                                 hover:border-violet-500 hover:text-violet-600
                                 text-slate-500 px-3 py-1.5 rounded-xl
                                 transition-all font-semibold flex items-center gap-1">
                <Copy size={14} /> Copier
              </button>
            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}