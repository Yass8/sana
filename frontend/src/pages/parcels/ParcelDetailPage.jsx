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
import { ArrowLeft, Copy, Download, AlertTriangle, ChevronUp, Plus } from 'lucide-react'
import DeleteButton from '../../components/ui/DeleteButton'

const BASE_API_URL = import.meta.env.VITE_BASE_API_URL


export default function ParcelDetailPage() {
  const { id }       = useParams()
  const { user }     = useAuth()
  const navigate     = useNavigate()
  const updateStatus = useUpdateParcelStatus()
  const [alertReason, setAlertReason] = useState('')
  const [showAlert,  setShowAlert]    = useState(false)
  const [totalPieces, setTotalPieces] = useState(1)
  const [currentPiece, setCurrentPiece] = useState(1)

  const { data: parcel, isLoading, isError } = useParcel(id)

  const handleReportIssue = async () => {
    const confirmed = await confirmActionAlert({
      message: 'Voulez-vous marquer ce colis comme problématique ?',
      confirmButtonText: 'Oui, signaler'
    })
    if (!confirmed) return

    try {
      await updateStatus.mutateAsync({ id, status: 'issue', notes: alertReason || undefined })
      setAlertReason('')
      setShowAlert(false)
      await showSuccessAlert({ text: 'Colis marqué comme problématique.' })
    } catch (err) {
      await showErrorAlert({ text: err?.message || 'Impossible de signaler le problème.' })
    }
  }

  const handleConfirmCollection = async () => {
    const confirmed = await confirmActionAlert({
      message: 'Voulez-vous confirmer le retrait de ce colis ?',
      confirmButtonText: 'Oui, confirmer'
    })
    if (!confirmed) return

    try {
      await updateStatus.mutateAsync({ id, status: 'collected', notes: undefined })
      await showSuccessAlert({ text: 'Retrait confirmé avec succès.' })
    } catch (err) {
      await showErrorAlert({ text: err?.message || 'Impossible de confirmer le retrait.' })
    }
  }

  // Nouvelles fonctions pour le colis individuel
  const handleDepartAirport = async () => {
    try {
      await updateStatus.mutateAsync({ id, status: 'departed_airport' })
      await showSuccessAlert({ text: 'Colis marqué comme parti de l\'aéroport.' })
    } catch (err) {
      await showErrorAlert({ text: err?.message || 'Erreur' })
    }
  }

  const handleArrivedDestination = async () => {
    try {
      await updateStatus.mutateAsync({ id, status: 'arrived_destination' })
      await showSuccessAlert({ text: 'Colis arrivé à destination.' })
    } catch (err) {
      await showErrorAlert({ text: err?.message || 'Erreur' })
    }
  }

  // Confirmer le retrait est possible si le statut est arrived_destination et que l'utilisateur est agent_af/admin
  const canConfirmCollection = parcel?.status === 'arrived_destination' && 
                               (user?.role === 'agent_af' || user?.role === 'admin')

  if (isLoading) return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5 animate-fadeIn">
      {/* ... skeleton inchangé ... */}
    </div>
  )
  if (isError) return (
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
              { label: 'Tél. exp.',   value: parcel.sender.phone ?? '—' },
              { label: 'Tél. dest.',   value: parcel.recipientPhone ?? '—' },
              { label: 'Sac',          value: parcel.bag?.qrcode ?? (parcel.bagId ? '—' : 'Aucun') },
              { label: 'Destination',  value: parcel.bag?.destinationAgency?.city ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-xl px-0 lg:px-1 py-1 lg:py-2.5">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                <p className="text-xs lg:text-sm text-slate-800 font-semibold mt-0.5 truncate">{value === '—' ? 'Non renseigné' : value}</p>
              </div>
            ))}
          </div>

          {parcel.description && (
            <div className="mt-2 bg-slate-50 rounded-xl px-0 lg:px-3 py-2.5">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Contenu</p>
              <p className="text-xs lg:text-sm text-slate-700 mt-0.5">{parcel.description}</p>
            </div>
          )}
          <div className="mt-4 flex items-center gap-3">
            {parcel.bagId && (
              <button onClick={() => navigate(`/bags/${parcel.bagId}`)}
                      className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-xl
                                 transition-all font-semibold flex items-center gap-1">
                <ChevronUp size={14} /> Accéder au sac
              </button>
            )}
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

          {/* Bloc conditionnel */}
          {parcel.bagId ? (
            // Message pour colis en sac
            <Card>
              <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-xs text-blue-700 font-semibold">
                  💡 Les transitions de statut se font via le sac (page Sacs)
                </p>
                <p className="text-[11px] text-blue-600 mt-1">
                  Tous les colis d'un même sac avancent ensemble. Vous pouvez uniquement confirmer le retrait ou signaler un problème sur ce colis.
                </p>
              </div>
            </Card>
          ) : (
            // Panneau de contrôle pour colis individuel
            <Card>
              <div className="p-5">
                <h2 style={{fontFamily:'var(--font-display)'}}
                    className="font-bold text-slate-900 mb-4">Gestion du colis individuel</h2>
                <div className="space-y-3">
                  {parcel.status === 'received' && (
                    <button onClick={handleDepartAirport} disabled={updateStatus.isPending}
                            className="w-full bg-[#7C3AED] hover:bg-[#5B21B6] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                      {updateStatus.isPending ? <Spinner size="sm" color="white"/> : 'Parti aéroport'}
                    </button>
                  )}
                  {parcel.status === 'departed_airport' && (
                    <button onClick={handleArrivedDestination} disabled={updateStatus.isPending}
                            className="w-full bg-[#34D399] hover:bg-[#059669] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                      {updateStatus.isPending ? <Spinner size="sm" color="white"/> : 'Arrivé destination'}
                    </button>
                  )}
                  {canConfirmCollection && (
                    <button onClick={handleConfirmCollection} disabled={updateStatus.isPending}
                            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                      {updateStatus.isPending ? <Spinner size="sm" color="white"/> : '✓ Confirmer le retrait'}
                    </button>
                  )}
                  {parcel.status !== 'issue' && (
                    <div>
                      <button onClick={() => setShowAlert(v => !v)} disabled={updateStatus.isPending}
                              className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 mb-3">
                        <AlertTriangle size={16} />
                        Marquer comme problématique
                      </button>
                      {showAlert && (
                        <div className="space-y-2 animate-fadeIn">
                          <textarea value={alertReason} onChange={e => setAlertReason(e.target.value)}
                                    placeholder="Décrivez le problème…" rows={2}
                                    className="w-full px-3 py-2.5 border-2 border-red-200 rounded-xl text-sm outline-none resize-none bg-white focus:border-red-400" />
                          <div className="flex gap-2">
                            <button onClick={() => setShowAlert(false)}
                                    className="flex-1 border-2 border-slate-200 text-slate-500 py-2 rounded-xl text-xs font-semibold">Annuler</button>
                            <button onClick={handleReportIssue} disabled={updateStatus.isPending}
                                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-xs">Confirmer</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Confirmer retrait pour colis en sac (si applicable) */}
          {canConfirmCollection && parcel.bagId && (
            <Card>
              <div className="p-5">
                <h2 style={{fontFamily:'var(--font-display)'}}
                    className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  Confirmer le retrait
                </h2>
                <button onClick={handleConfirmCollection} disabled={updateStatus.isPending}
                        className="w-full bg-green-600 hover:bg-green-500
                                   disabled:opacity-60 text-white font-semibold
                                   py-2.5 rounded-xl text-sm transition-colors
                                   flex items-center justify-center gap-2">
                  {updateStatus.isPending
                    ? <><Spinner size="sm" color="white"/> Confirmation…</>
                    : '✓ Confirmer le retrait du colis'
                  }
                </button>
              </div>
            </Card>
          )}

          {/* Signaler un problème pour colis en sac (si applicable) */}
          {parcel.status !== 'issue' && parcel.bagId && (
            <Card>
              <div className="p-5">
                <h2 style={{fontFamily:'var(--font-display)'}}
                    className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-500" />
                  Signaler un problème
                </h2>
                <button onClick={() => setShowAlert(v => !v)}
                        className="w-full bg-red-500 hover:bg-red-600
                                   disabled:opacity-60 text-white font-semibold
                                   py-2.5 rounded-xl text-sm transition-colors
                                   flex items-center justify-center gap-2 mb-3"
                        disabled={updateStatus.isPending}>
                  {updateStatus.isPending
                    ? <><Spinner size="sm" color="white"/> Mise à jour…</>
                    : <><AlertTriangle size={16} /> Marquer comme problématique</>
                  }
                </button>
                {showAlert && (
                  <div className="mt-3 space-y-2 animate-fadeIn">
                    <textarea value={alertReason} onChange={e => setAlertReason(e.target.value)}
                              placeholder="Décrivez le problème…" rows={2}
                              className="w-full px-3 py-2.5 border-2 border-red-200 rounded-xl text-sm outline-none resize-none bg-white focus:border-red-400"/>
                    <div className="flex gap-2">
                      <button onClick={() => setShowAlert(false)}
                              className="flex-1 border-2 border-slate-200 text-slate-500 py-2 rounded-xl text-xs font-semibold">Annuler</button>
                      <button onClick={handleReportIssue}
                              disabled={updateStatus.isPending}
                              className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-xs">Confirmer</button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {parcel.status === 'issue' && (
            <Card>
              <div className="p-5 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-xs text-red-700 font-semibold flex items-center gap-2">
                  <AlertTriangle size={14} /> Problème signalé
                </p>
                <p className="text-[11px] text-red-600 mt-1">
                  Ce colis est marqué comme problématique et ne suivra pas le flux normal.
                </p>
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
                  <img src={parcel.qrcodeUrl.startsWith('http') ? parcel.qrcodeUrl : `${BASE_API_URL}${parcel.qrcodeUrl}`}
                      alt={parcel.qrcode}
                      className="w-40 h-40"/>

                  {/* Personnalisation nombre de pièces (colis uniquement) */}
                  <div className="flex items-center gap-2 text-xs">
                    <label className="text-slate-500">Pièce n°</label>
                    <input
                      type="number"
                      min={1}
                      max={totalPieces}
                      value={currentPiece}
                      onChange={(e) => {
                        let val = parseInt(e.target.value, 10)
                        if (isNaN(val) || val < 1) val = 1
                        if (val > totalPieces) val = totalPieces
                        setCurrentPiece(val)
                      }}
                      className="w-14 px-2 py-1 border border-slate-200 rounded-lg text-center text-slate-700"
                    />
                    <span className="text-slate-400">/</span>
                    <input
                      type="number"
                      min={1}
                      value={totalPieces}
                      onChange={(e) => {
                        let val = parseInt(e.target.value, 10)
                        if (isNaN(val) || val < 1) val = 1
                        setTotalPieces(val)
                        if (currentPiece > val) setCurrentPiece(val)
                      }}
                      className="w-14 px-2 py-1 border border-slate-200 rounded-lg text-center text-slate-700"
                    />
                  </div>

                  <LabelPrinter
                    code={parcel.qrcode}
                    qrcodeUrl={parcel.qrcodeUrl.startsWith('http') ? parcel.qrcodeUrl : `${BASE_API_URL}${parcel.qrcodeUrl}`}
                    className="w-full max-w-xs"
                    recipientInfo={parcel.recipientPhone ? `${parcel.recipientName} :  ${parcel.recipientPhone}` : parcel.recipientName  || 'Tél non renseigné'}
                    pieceNumber={currentPiece}
                    totalPieces={totalPieces}
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