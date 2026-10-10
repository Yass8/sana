import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Lock,
  Package,
  Pencil,
  Plus,
  QrCode,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useParcel, useUpdateParcelStatus } from '../../hooks/useParcels'
import { useBags } from '../../hooks/useBags'
import { parcelsApi } from '../../api/parcels.api'
import TrackingTimeline from '../../components/ui/TrackingTimeline'
import StatusBadge from '../../components/ui/StatusBadge'
import DeleteButton from '../../components/ui/DeleteButton'
import { ParcelLabelPrinter } from '../../components/ui/ParcelLabelPrinter'
import {
  confirmActionAlert,
  showSuccessAlert,
  showErrorAlert,
} from '../../components/ui/SweetsAlert'

const BASE_API_URL = import.meta.env.VITE_BASE_API_URL

// ────────────────────────────────────────────────────────────
// Config factures
// ────────────────────────────────────────────────────────────
const INVOICE_STATUS_CONFIG = {
  paid:           { label: 'Payée',               dot: 'bg-emerald-500', tone: 'text-emerald-700' },
  partially_paid: { label: 'Partiellement payée', dot: 'bg-amber-500',   tone: 'text-amber-700' },
  draft:          { label: 'Brouillon',           dot: 'bg-slate-400',   tone: 'text-slate-700' },
  overdue:        { label: 'En retard',           dot: 'bg-rose-500',    tone: 'text-rose-700' },
  none:           { label: 'Aucune facture',      dot: 'bg-slate-300',   tone: 'text-slate-500' },
}

// ────────────────────────────────────────────────────────────
// Primitives
// ────────────────────────────────────────────────────────────
function Section({ title, description, icon: Icon, action, children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3.5">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              {Icon ? <Icon size={14} className="text-slate-400" /> : null}
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            ) : null}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

function Field({ label, value, empty = 'Non renseigné' }) {
  const isEmpty = value === null || value === undefined || value === '' || value === '—'
  return (
    <div className="border-b border-slate-100 px-4 py-3 last:border-0 sm:border-b-0 sm:border-r sm:px-4 sm:py-3 sm:last:border-r-0">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className={`mt-0.5 truncate text-sm ${isEmpty ? 'text-slate-400' : 'font-medium text-slate-800'}`}>
        {isEmpty ? empty : value}
      </p>
    </div>
  )
}

function InvoiceBanner({ status, invoiceId, onView }) {
  const cfg = INVOICE_STATUS_CONFIG[status] || INVOICE_STATUS_CONFIG.none
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <span className="inline-flex min-w-0 items-center gap-2 text-xs font-medium text-slate-700">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
        <span className="truncate">Facture : {cfg.label}</span>
      </span>
      {invoiceId ? (
        <button
          type="button"
          onClick={onView}
          className="shrink-0 text-[11px] font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
        >
          Voir
        </button>
      ) : null}
    </div>
  )
}

function PrimaryButton({ icon: Icon, loading, children, className = '', ...props }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : Icon ? (
        <Icon size={15} />
      ) : null}
      {children}
    </button>
  )
}

function GhostButton({ icon: Icon, loading, children, className = '', tone = 'default', ...props }) {
  const toneClass =
    tone === 'danger'
      ? 'text-rose-600 hover:bg-rose-50'
      : tone === 'success'
      ? 'text-emerald-700 hover:bg-emerald-50'
      : 'text-slate-700 hover:bg-slate-100'

  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${toneClass} ${className}`}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      ) : Icon ? (
        <Icon size={15} />
      ) : null}
      {children}
    </button>
  )
}

function InlineButton({ icon: Icon, children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {Icon ? <Icon size={13} /> : null}
      {children}
    </button>
  )
}

// ────────────────────────────────────────────────────────────
// Skeleton
// ────────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 pb-10">
      <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
      <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
        </div>
        <div className="space-y-4">
          <div className="h-52 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════
export default function ParcelDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const updateStatus = useUpdateParcelStatus()

  const [alertReason, setAlertReason] = useState('')
  const [showAlert, setShowAlert] = useState(false)
  const [totalPieces, setTotalPieces] = useState(1)
  const [currentPiece, setCurrentPiece] = useState(1)
  const [selectedBagId, setSelectedBagId] = useState('')

  const { data: parcel, isLoading, isError } = useParcel(id)
  const { data: openBags = [], isLoading: loadingBags } = useBags({ status: 'ouvert' })
  const effectiveSelectedBagId = selectedBagId || parcel?.bagId || ''

  // ── État de la facture ────────────────────────────────────
  const invoiceStatus = parcel?.invoice?.status || 'none'
  const isInvoicePaid = invoiceStatus === 'paid'

  // ── Mutation sac ──────────────────────────────────────────
  const bagMutation = useMutation({
    mutationFn: (bagId) => parcelsApi.update(id, { bagId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['parcel', id] })
      await queryClient.invalidateQueries({ queryKey: ['parcels'] })
      await queryClient.invalidateQueries({ queryKey: ['bags'] })
      await showSuccessAlert({ text: 'Sac mis à jour avec succès.' })
    },
    onError: async (err) => {
      await showErrorAlert({
        text: err?.message || 'Erreur lors de la modification du sac.',
      })
    },
  })

  // ── Handlers ──────────────────────────────────────────────
  const handleReportIssue = async () => {
    const confirmed = await confirmActionAlert({
      message: 'Voulez-vous marquer ce colis comme problématique ?',
      confirmButtonText: 'Oui, signaler',
    })
    if (!confirmed) return
    try {
      await updateStatus.mutateAsync({
        id,
        status: 'issue',
        notes: alertReason || undefined,
      })
      setAlertReason('')
      setShowAlert(false)
      await showSuccessAlert({ text: 'Colis marqué comme problématique.' })
    } catch (err) {
      await showErrorAlert({
        text: err?.message || 'Impossible de signaler le problème.',
      })
    }
  }

  const handleConfirmCollection = async () => {
    if (!isInvoicePaid) {
      return showErrorAlert({
        title: 'Facture non payée',
        text:
          invoiceStatus === 'none'
            ? "Aucune facture n'est associée à ce colis. Générez la facture avant de confirmer le retrait."
            : `La facture est ${INVOICE_STATUS_CONFIG[invoiceStatus].label.toLowerCase()}. Le paiement complet est requis pour confirmer le retrait.`,
      })
    }
    const confirmed = await confirmActionAlert({
      message: 'Voulez-vous confirmer le retrait de ce colis ?',
      confirmButtonText: 'Oui, confirmer',
    })
    if (!confirmed) return
    try {
      await updateStatus.mutateAsync({ id, status: 'collected', notes: undefined })
      await showSuccessAlert({ text: 'Retrait confirmé avec succès.' })
    } catch (err) {
      await showErrorAlert({
        text: err?.message || 'Impossible de confirmer le retrait.',
      })
    }
  }

  const handleRemoveBag = async () => {
    const confirmed = await confirmActionAlert({
      message: 'Voulez-vous retirer ce colis du sac actuel ?',
      confirmButtonText: 'Oui, retirer',
    })
    if (!confirmed) return
    bagMutation.mutate(null)
  }

  const handleAssignBag = async () => {
    if (!selectedBagId) {
      await showErrorAlert({ text: 'Veuillez sélectionner un sac ouvert.' })
      return
    }
    bagMutation.mutate(selectedBagId)
  }

  const handleDepartAirport = async () => {
    try {
      await updateStatus.mutateAsync({ id, status: 'departed_airport' })
      await showSuccessAlert({ text: "Colis marqué comme parti de l'aéroport." })
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

  // ── États dérivés ─────────────────────────────────────────
  const canConfirmCollection =
    parcel?.status === 'arrived_destination' &&
    (user?.role === 'agent_af' || user?.role === 'admin')

  // ── Rendu ─────────────────────────────────────────────────
  if (isLoading) return <DetailSkeleton />

  if (isError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Package size={18} />
        </div>
        <p className="text-sm font-medium text-slate-700">Colis introuvable</p>
        <button
          type="button"
          onClick={() => navigate('/parcels')}
          className="mt-1 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft size={14} />
          Retour aux colis
        </button>
      </div>
    )
  }

  const qrUrl = parcel.qrcodeUrl
    ? parcel.qrcodeUrl.startsWith('http')
      ? parcel.qrcodeUrl
      : `${BASE_API_URL}${parcel.qrcodeUrl}`
    : null

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-10">
      {/* Fil d'Ariane */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500">
        <button
          type="button"
          onClick={() => navigate('/parcels')}
          className="transition hover:text-slate-800"
        >
          Colis
        </button>
        <span className="text-slate-300">/</span>
        <span className="font-mono font-medium text-slate-900">{parcel.qrcode}</span>
      </nav>

      {/* En-tête */}
      <header className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-xl font-semibold text-slate-900">
                {parcel.qrcode}
              </h1>
              <StatusBadge
                status={parcel.status}
                size="md"
                updatedAt={parcel.updatedAt}
              />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Déposé le{' '}
              {new Date(parcel.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {parcel.weight ? (
                <>
                  {' · '}
                  <span className="tabular-nums">{parcel.weight} kg</span>
                </>
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {parcel.bagId ? (
              <button
                type="button"
                onClick={() => navigate(`/bags/${parcel.bagId}`)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <ArrowUpRight size={14} />
                Accéder au sac
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => navigate(`/parcels/${id}/edit`)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Pencil size={14} />
              Modifier
            </button>
            <DeleteButton type="parcel" id={id} />
          </div>
        </div>

        {/* Grille de champs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Expéditeur" value={parcel.sender?.name} />
          <Field label="Destinataire" value={parcel.recipientName} />
          <Field label="Destination" value={parcel.bag?.destinationAgency?.city} />

          <Field label="Email expéditeur" value={parcel.sender?.email} />
          <Field label="Téléphone expéditeur" value={parcel.sender?.phone} />
          <Field label="Téléphone destinataire" value={parcel.recipientPhone} />

          <Field label="Adresse destinataire" value={parcel.recipientAddress} />
          <Field
            label="Sac"
            value={parcel.bag?.qrcode ?? (parcel.bagId ? '—' : 'Aucun')}
            empty="Aucun"
          />
          <Field label="Service" value={parcel.service} />

          <Field label="Type" value={parcel.type} />
          <Field label="Urgent" value={parcel.urgent ? 'Oui' : 'Non'} />
          <Field label="Fragile" value={parcel.fragile ? 'Oui' : 'Non'} />
        </div>

        {parcel.description ? (
          <div className="border-t border-slate-200 bg-slate-50/60 px-5 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Contenu
            </p>
            <p className="mt-1 text-sm text-slate-700">{parcel.description}</p>
          </div>
        ) : null}
      </header>

      {/* Corps */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Colonne principale */}
        <div className="flex flex-col gap-5">
          <Section
            title="Suivi du colis"
            description={`${(parcel.trackingEvents ?? []).length} événement(s)`}
          >
            <div className="px-5 py-4">
              <TrackingTimeline
                events={parcel.trackingEvents ?? []}
                currentStatus={parcel.status}
              />
            </div>
          </Section>

          <Section
            title="Gestion du sac"
            description={
              parcel?.bagId
                ? 'Retirez ce colis ou déplacez-le vers un autre sac ouvert.'
                : 'Associez ce colis à un sac ouvert.'
            }
          >
            <div className="space-y-4 px-5 py-4">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <span className="text-xs text-slate-500">Sac actuel</span>
                <span className="font-mono text-xs font-medium text-slate-900">
                  {parcel?.bag?.qrcode ?? 'Aucun'}
                </span>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Déplacer vers un sac ouvert
                </label>
                <select
                  value={effectiveSelectedBagId}
                  onChange={(e) => setSelectedBagId(e.target.value)}
                  disabled={bagMutation.isPending || loadingBags}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:opacity-60"
                >
                  <option value="">— Sélectionner un sac —</option>
                  {openBags.map((bag) => (
                    <option key={bag.id} value={bag.id}>
                      {bag.qrcode}
                      {bag.destinationAgency?.city
                        ? ` · ${bag.destinationAgency.city}`
                        : ''}
                    </option>
                  ))}
                </select>
                {!loadingBags && openBags.length === 0 && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    Aucun sac ouvert disponible pour le moment.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <GhostButton
                  type="button"
                  onClick={handleRemoveBag}
                  loading={bagMutation.isPending}
                  disabled={
                    bagMutation.isPending || parcel?.status === 'collected'
                  }
                >
                  Retirer du sac
                </GhostButton>
                <PrimaryButton
                  type="button"
                  onClick={handleAssignBag}
                  loading={bagMutation.isPending}
                  disabled={
                    bagMutation.isPending ||
                    !selectedBagId ||
                    parcel?.status === 'collected'
                  }
                >
                  Déplacer
                </PrimaryButton>
              </div>
            </div>
          </Section>

          {/* Panneau de contrôle — colis individuel */}
          {!parcel.bagId && (
            <Section title="Actions sur le colis">
              <div className="space-y-4 px-5 py-4">
                <InvoiceBanner
                  status={invoiceStatus}
                  invoiceId={parcel.invoice?.id}
                  onView={() => navigate(`/invoices/${parcel.invoice.id}`)}
                />

                <div className="space-y-3">
                  {parcel.status === 'received' && (
                    <PrimaryButton
                      onClick={handleDepartAirport}
                      loading={updateStatus.isPending}
                    >
                      Marquer « Parti de l'aéroport »
                    </PrimaryButton>
                  )}

                  {parcel.status === 'departed_airport' && (
                    <PrimaryButton
                      onClick={handleArrivedDestination}
                      loading={updateStatus.isPending}
                    >
                      Marquer « Arrivé à destination »
                    </PrimaryButton>
                  )}

                  {canConfirmCollection && (
                    <div className="space-y-2">
                      <PrimaryButton
                        onClick={handleConfirmCollection}
                        loading={updateStatus.isPending}
                        disabled={!isInvoicePaid}
                        icon={Check}
                        className="!bg-emerald-600 hover:!bg-emerald-500"
                      >
                        Confirmer le retrait
                      </PrimaryButton>
                      {!isInvoicePaid && (
                        <p className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                          <Lock size={12} className="mt-0.5 shrink-0" />
                          Le retrait ne peut être confirmé que si la facture est
                          entièrement payée.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Section>
          )}

          {/* Confirmer retrait — colis en sac */}
          {canConfirmCollection && parcel.bagId && (
            <Section title="Confirmer le retrait">
              <div className="space-y-4 px-5 py-4">
                <InvoiceBanner
                  status={invoiceStatus}
                  invoiceId={parcel.invoice?.id}
                  onView={() => navigate(`/invoices/${parcel.invoice.id}`)}
                />
                <PrimaryButton
                  onClick={handleConfirmCollection}
                  loading={updateStatus.isPending}
                  disabled={!isInvoicePaid}
                  icon={Check}
                  className="!bg-emerald-600 hover:!bg-emerald-500"
                >
                  Confirmer le retrait du colis
                </PrimaryButton>
                {!isInvoicePaid && (
                  <p className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    <Lock size={12} className="mt-0.5 shrink-0" />
                    Le retrait ne peut être confirmé que si la facture est
                    entièrement payée.
                  </p>
                )}
              </div>
            </Section>
          )}

          {/* Signaler un problème */}
          {parcel.status !== 'issue' && (
            <Section
              title="Signaler un problème"
              description="Le colis sortira du flux normal."
              icon={AlertTriangle}
            >
              <div className="space-y-3 px-5 py-4">
                {!showAlert ? (
                  <GhostButton
                    tone="danger"
                    icon={AlertTriangle}
                    onClick={() => setShowAlert(true)}
                    disabled={updateStatus.isPending}
                  >
                    Marquer comme problématique
                  </GhostButton>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={alertReason}
                      onChange={(e) => setAlertReason(e.target.value)}
                      placeholder="Décrivez le problème…"
                      rows={3}
                      className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <GhostButton
                        type="button"
                        onClick={() => {
                          setShowAlert(false)
                          setAlertReason('')
                        }}
                      >
                        Annuler
                      </GhostButton>
                      <button
                        type="button"
                        onClick={handleReportIssue}
                        disabled={updateStatus.isPending}
                        className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-medium text-white transition hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updateStatus.isPending ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        ) : null}
                        Confirmer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {parcel.status === 'issue' && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600" />
              <div>
                <p className="text-sm font-semibold text-rose-800">
                  Problème signalé
                </p>
                <p className="mt-0.5 text-xs text-rose-700">
                  Ce colis ne suivra pas le flux normal tant que le problème n'est
                  pas résolu.
                </p>
              </div>
            </div>
          )}

          {parcel.bagId ? (
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
              <Package size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Colis rattaché à un sac
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Les transitions de statut s'effectuent depuis la page du sac. Vous
                  pouvez uniquement confirmer le retrait ou signaler un problème sur
                  ce colis.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Colonne latérale */}
        <aside className="flex flex-col gap-5">
          {/* QR code */}
          <Section
            title="Étiquette & QR code"
            icon={QrCode}
            description="À imprimer et coller sur le colis."
          >
            <div className="flex flex-col items-center gap-4 px-5 py-5">
              {qrUrl ? (
                <>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <img src={qrUrl} alt={parcel.qrcode} className="h-40 w-40" />
                  </div>

                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-xs text-slate-500">Pièce</span>
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
                      className="h-8 w-14 rounded-lg border border-slate-300 bg-white text-center text-sm tabular-nums text-slate-800 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                    <span className="text-xs text-slate-400">/</span>
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
                      className="h-8 w-14 rounded-lg border border-slate-300 bg-white text-center text-sm tabular-nums text-slate-800 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <ParcelLabelPrinter
                    code={parcel.qrcode}
                    qrcodeUrl={qrUrl}
                    recipientName={parcel.recipientName || 'Destinataire'}
                    recipientAddress={
                      parcel.recipientAddress || 'Adresse non renseignée'
                    }
                    recipientPhone={parcel.recipientPhone || 'Tél non renseigné'}
                    weight={parcel.weight || 0}
                    service={parcel.service || 'Standard'}
                    fragile={parcel.fragile || false}
                    date={new Date(parcel.createdAt)
                      .toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                      .replace('.', '')}
                    pieceNumber={currentPiece}
                    totalPieces={totalPieces}
                  />

                  <a
                    href={qrUrl}
                    download={`${parcel.qrcode}.png`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 underline-offset-2 transition hover:text-slate-900 hover:underline"
                  >
                    <Download size={13} />
                    Télécharger le PNG
                  </a>
                </>
              ) : (
                <p className="py-6 text-center text-xs text-slate-400">
                  QR code non disponible.
                </p>
              )}
            </div>
          </Section>

          {/* Lien de suivi */}
          <Section title="Lien de suivi" description="À partager avec le client.">
            <div className="flex items-center gap-2 px-5 py-4">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-600">
                {`${window.location.origin}/track/${parcel.qrcode}`}
              </code>
              <InlineButton
                type="button"
                icon={Copy}
                onClick={() =>
                  navigator.clipboard?.writeText(
                    `${window.location.origin}/track/${parcel.qrcode}`
                  )
                }
              >
                Copier
              </InlineButton>
            </div>
          </Section>
        </aside>
      </div>
    </div>
  )
}