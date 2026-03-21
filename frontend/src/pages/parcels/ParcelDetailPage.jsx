// src/pages/parcels/ParcelDetailPage.jsx
import { useState }           from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth }            from '../../context/AuthContext'
import { useParcel, useUpdateParcelStatus } from '../../hooks/useParcels'
import { useSocket }          from '../../hooks/useSocket'
import TrackingTimeline       from '../../components/ui/TrackingTimeline'
import StatusBadge            from '../../components/ui/StatusBadge'

// Transitions autorisées par rôle (même logique que ScanPage)
const NEXT_STATUS = {
  agent_fr: {
    received:        'departed_agency',
    departed_agency: 'departed_airport',
  },
  agent_af: {
    departed_airport:    'arrived_destination',
    arrived_destination: 'collected',
  },
  admin: {
    received:            'departed_agency',
    departed_agency:     'departed_airport',
    departed_airport:    'arrived_destination',
    arrived_destination: 'collected',
  },
}

const NEXT_LABEL = {
  departed_agency:     'Confirmer départ agence',
  departed_airport:    'Confirmer embarquement',
  arrived_destination: 'Confirmer arrivée destination',
  collected:           'Confirmer retrait destinataire',
}

export default function ParcelDetailPage() {
  const { id }       = useParams()
  const { user }     = useAuth()
  const navigate     = useNavigate()
  const updateStatus = useUpdateParcelStatus()

  const [notes,      setNotes]      = useState('')
  const [showNotes,  setShowNotes]  = useState(false)
  const [justUpdated, setJustUpdated] = useState(false)

  useSocket()

  const { data: parcel, isLoading, isError } = useParcel(id)

  const nextStatus = NEXT_STATUS[user?.role]?.[parcel?.status]

  const handleUpdateStatus = async () => {
    if (!nextStatus) return
    try {
      await updateStatus.mutateAsync({
        id,
        status: nextStatus,
        notes:  notes || undefined,
      })
      setNotes('')
      setShowNotes(false)
      setJustUpdated(true)
      setTimeout(() => setJustUpdated(false), 3000)
    } catch (err) {
      console.error(err)
    }
  }

  // ── États de chargement ───────────────────────────────
  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-[#E8673C] border-t-transparent
                      rounded-full animate-spin" />
    </div>
  )

  if (isError) return (
    <div className="text-center py-20">
      <p className="text-slate-400 text-sm mb-4">Colis introuvable.</p>
      <button onClick={() => navigate('/parcels')}
              className="text-[#E8673C] text-sm hover:underline">
        ← Retour à la liste
      </button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5">

      {/* ── Breadcrumb ──────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <button onClick={() => navigate('/parcels')}
                className="hover:text-[#E8673C] transition-colors">
          Colis
        </button>
        <span>/</span>
        <span style={{fontFamily:'var(--font-display)'}}
              className="text-[#E8673C] font-semibold">
          {parcel.barcode}
        </span>
      </div>

      {/* ── Header colis ────────────────────────────────── */}
      <div className="bg-white border border-slate-100 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 style={{fontFamily:'var(--font-display)'}}
                className="text-2xl font-bold text-[#0F1923]">
              {parcel.barcode}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Déposé le {new Date(parcel.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}
              {parcel.weight ? ` · ${parcel.weight} kg` : ''}
            </p>
          </div>
          <StatusBadge status={parcel.status} />
        </div>

        {/* Grille infos */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Expéditeur',    value: parcel.sender?.name },
            { label: 'Destinataire',  value: parcel.recipientName },
            { label: 'Email dest.',   value: parcel.recipientEmail ?? '—' },
            { label: 'Tél. dest.',    value: parcel.recipientPhone ?? '—' },
            { label: 'Sac',           value: parcel.bag?.barcode },
            { label: 'Destination',   value: parcel.bag?.shipment
                                              ?.destinationAgency?.city ?? '—' },
          ].map(({ label, value }) => (
            <div key={label}
                 className="bg-slate-50 rounded-lg px-4 py-3">
              <p className="text-[10px] text-slate-400 uppercase
                            tracking-wide mb-1">{label}</p>
              <p className="text-sm text-[#0F1923] font-medium
                            truncate">{value ?? '—'}</p>
            </div>
          ))}
        </div>

        {/* Description si renseignée */}
        {parcel.description && (
          <div className="mt-3 bg-slate-50 rounded-lg px-4 py-3">
            <p className="text-[10px] text-slate-400 uppercase
                          tracking-wide mb-1">Contenu déclaré</p>
            <p className="text-sm text-slate-600">{parcel.description}</p>
          </div>
        )}
      </div>

      {/* ── Layout 2 colonnes sur écran large ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Colonne 1 : Timeline */}
        <div className="bg-white border border-slate-100 rounded-xl p-6">
          <h2 style={{fontFamily:'var(--font-display)'}}
              className="text-sm font-bold text-[#0F1923] mb-5">
            Suivi du colis
          </h2>
          <TrackingTimeline
            events={parcel.trackingEvents ?? []}
            currentStatus={parcel.status}
          />
        </div>

        {/* Colonne 2 : Actions + Barcode */}
        <div className="flex flex-col gap-4">

          {/* Toast succès */}
          {justUpdated && (
            <div className="bg-emerald-50 border border-emerald-200
                            text-emerald-700 text-sm px-4 py-3
                            rounded-xl flex items-center gap-2">
              <span>✓</span>
              Statut mis à jour — notification envoyée.
            </div>
          )}

          {/* Action update statut */}
          {nextStatus && (
            <div className="bg-white border border-slate-100 rounded-xl p-5">
              <h2 style={{fontFamily:'var(--font-display)'}}
                  className="text-sm font-bold text-[#0F1923] mb-4">
                Prochaine étape
              </h2>

              <button
                onClick={handleUpdateStatus}
                disabled={updateStatus.isPending}
                className="w-full bg-[#E8673C] hover:bg-[#D45A30]
                           disabled:opacity-60 text-white font-medium
                           text-sm py-3 rounded-lg transition-colors mb-3"
              >
                {updateStatus.isPending
                  ? 'Mise à jour…'
                  : NEXT_LABEL[nextStatus]}
              </button>

              {/* Notes optionnelles */}
              <button
                onClick={() => setShowNotes(v => !v)}
                className="text-xs text-slate-400 hover:text-slate-600
                           transition-colors w-full text-center"
              >
                {showNotes ? '↑ Masquer les notes' : '+ Ajouter une note'}
              </button>

              {showNotes && (
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notes pour cette étape…"
                  rows={2}
                  className="mt-3 w-full px-3 py-2.5 border-[1.5px]
                             border-slate-200 rounded-lg text-sm
                             outline-none resize-none transition-all
                             focus:border-[#E8673C] focus:ring-2
                             focus:ring-[#E8673C]/10"
                />
              )}
            </div>
          )}

          {/* Code-barres */}
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <h2 style={{fontFamily:'var(--font-display)'}}
                className="text-sm font-bold text-[#0F1923] mb-4">
              Code-barres
            </h2>
            {parcel.barcodeUrl ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={parcel.barcodeUrl}
                  alt={parcel.barcode}
                  className="w-full max-w-[240px] h-auto"
                />
                <a
                  href={parcel.barcodeUrl}
                  download={`${parcel.barcode}.png`}
                  className="text-xs text-[#E8673C] hover:underline"
                >
                  Télécharger PNG
                </a>
                
                <button
                    onClick={() => navigate(`/parcels/${parcel.id}/print`)}
                    className="text-xs text-slate-500 hover:text-[#0F1923]
                                transition-colors mt-1"
                    >
                    Imprimer
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                Code-barres non disponible.
              </p>
            )}
          </div>

          {/* Lien suivi public */}
          <div className="bg-slate-50 border border-slate-100
                          rounded-xl p-4 flex items-center
                          justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[#0F1923]">
                Lien de suivi client
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                À partager avec l'expéditeur
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(
                  `${window.location.origin}/track/${parcel.barcode}`
                )
              }}
              className="text-xs bg-white border border-slate-200
                         hover:border-[#E8673C] hover:text-[#E8673C]
                         text-slate-500 px-3 py-1.5 rounded-lg
                         transition-all flex-shrink-0"
            >
              Copier le lien
            </button>
          </div>

        </div>
      </div>

    </div>
  )
}