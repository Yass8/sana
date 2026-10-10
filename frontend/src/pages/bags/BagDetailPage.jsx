import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  Copy,
  Download,
  Package,
  Pencil,
  Plus,
  QrCode,
  Scale,
  Search,
  X,
} from 'lucide-react'
import { bagsApi } from '../../api/bags.api'
import StatusBadge from '../../components/ui/StatusBadge'
import DeleteButton from '../../components/ui/DeleteButton'
import { BagLabelPrinter } from '../../components/ui/BagLabelPrinter'
import {
  confirmDeleteAlert,
  showSuccessAlert,
  showErrorAlert,
} from '../../components/ui/SweetsAlert'
import { useAvailableParcels } from '../../hooks/useParcels'

const BASE_API_URL = import.meta.env.VITE_BASE_API_URL

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

function PrimaryButton({ icon: Icon, loading, children, className = '', tone = 'default', ...props }) {
  const toneClass =
    tone === 'violet'
      ? 'bg-violet-600 hover:bg-violet-500 focus:ring-violet-600'
      : tone === 'emerald'
      ? 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-600'
      : tone === 'rose'
      ? 'bg-rose-600 hover:bg-rose-500 focus:ring-rose-600'
      : 'bg-slate-900 hover:bg-slate-800 focus:ring-slate-900'

  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${toneClass} ${className}`}
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
      ? 'text-rose-600 hover:bg-rose-50 border-rose-200'
      : 'text-slate-700 hover:bg-slate-50 border-slate-300'

  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border bg-white px-4 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${toneClass} ${className}`}
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
      <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
      <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
        </div>
        <div className="space-y-5">
          <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════
export default function BagDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [alertMsg, setAlertMsg] = useState('')
  const [showAlert, setShowAlert] = useState(false)
  const [selectedParcels, setSelectedParcels] = useState(new Set())
  const [searchAvailable, setSearchAvailable] = useState('')

  const { data: bag, isLoading } = useQuery({
    queryKey: ['bag', id],
    queryFn: () => bagsApi.getById(id),
  })

  // ── Mutations ─────────────────────────────────────────────
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
      await showSuccessAlert({ text: 'Message envoyé aux clients du sac.' })
    },
    onError: async (err) => {
      await showErrorAlert({ text: err?.message || "Impossible d'envoyer l'alerte." })
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

  const availableParcels = useAvailableParcels()

  const addParcelsMutation = useMutation({
    mutationFn: (parcelIds) => bagsApi.addParcels(id, parcelIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bag', id] })
      queryClient.invalidateQueries({ queryKey: ['available-parcels'] })
      setSelectedParcels(new Set())
      showSuccessAlert({ text: 'Colis ajoutés au sac.' })
    },
    onError: (err) =>
      showErrorAlert({ text: err.message || "Erreur lors de l'ajout." }),
  })

  // ── Handlers ──────────────────────────────────────────────
  const handleCloseBag = async () => {
    const confirmed = await confirmDeleteAlert({
      message: 'Voulez-vous vraiment fermer ce sac ? Cette action est définitive.',
      confirmButtonText: 'Fermer',
    })
    if (!confirmed) return
    closeBag.mutate()
  }

  const handleDepartAirport = () => updateBagStatus.mutate({ action: 'airport' })
  const handleArrived = () => updateBagStatus.mutate({ action: 'destination' })

  // ── États dérivés ─────────────────────────────────────────
  const parcels = bag?.parcels ?? []
  const status = bag?.status
  const hasParcels = parcels.length > 0

  const canClose = status === 'ouvert'
  const canMarkDepartAirport = status === 'fermé'
  const canMarkArrived = status === 'en_transit'
  const canAlert = ['fermé', 'en_transit', 'arrivé'].includes(status)

  const isMutating =
    closeBag.isPending || updateBagStatus.isPending || sendAlert.isPending

  // ── Rendu : loading ───────────────────────────────────────
  if (isLoading) return <DetailSkeleton />

  const qrUrl = bag?.qrcodeUrl
    ? bag.qrcodeUrl.startsWith('http')
      ? bag.qrcodeUrl
      : `${BASE_API_URL}${bag.qrcodeUrl}`
    : null

  // ── Filtre colis disponibles ──────────────────────────────
  const availableFiltered =
    availableParcels.data?.filter((p) => {
      if (!searchAvailable.trim()) return true
      const term = searchAvailable.toLowerCase()
      return (
        p.qrcode?.toLowerCase().includes(term) ||
        p.sender?.name?.toLowerCase().includes(term) ||
        p.recipientName?.toLowerCase().includes(term)
      )
    }) ?? []

  const selectedWeightKg = availableFiltered
    .filter((p) => selectedParcels.has(p.id))
    .reduce((sum, p) => sum + (Number(p.weight) || 0), 0)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-10">
      {/* Fil d'Ariane */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500">
        <button
          type="button"
          onClick={() => navigate('/bags')}
          className="transition hover:text-slate-800"
        >
          Sacs
        </button>
        <span className="text-slate-300">/</span>
        <span className="font-mono font-medium text-slate-900">{bag?.qrcode}</span>
      </nav>

      {/* En-tête */}
      <header className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-xl font-semibold text-slate-900">
                {bag?.qrcode}
              </h1>
              <StatusBadge status={bag?.status} size="md" updatedAt={bag?.updatedAt} />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1">
                {bag?.originAgency?.city ?? '—'}
                <ArrowRight size={12} className="text-slate-400" />
                <span className="font-medium text-slate-700">
                  {bag?.destinationAgency?.city ?? '—'}
                </span>
              </span>
              {bag?.weight ? (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="tabular-nums">{bag.weight} kg</span>
                </>
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/parcels/new?bagId=${id}`)}
              disabled={bag?.status !== 'ouvert'}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={14} />
              Ajouter un colis
            </button>
            <button
              type="button"
              onClick={() => navigate(`/bags/${id}/edit`)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              <Pencil size={14} />
              Modifier
            </button>
            <DeleteButton type="bag" id={id} />
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-3">
          <div className="flex items-center gap-3 bg-white px-5 py-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Package size={14} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Colis
              </p>
              <p className="text-lg font-semibold tabular-nums text-slate-900">
                {parcels.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white px-5 py-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Scale size={14} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Poids total
              </p>
              <p className="text-lg font-semibold tabular-nums text-slate-900">
                {bag?.weight ?? '—'}
                {bag?.weight ? (
                  <span className="ml-1 text-sm font-normal text-slate-400">kg</span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white px-5 py-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Calendar size={14} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Créé le
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {new Date(bag?.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Corps */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Colonne principale */}
        <div className="flex flex-col gap-5">
          {/* Actions selon statut */}
          {(canClose || canMarkDepartAirport || canMarkArrived) && (
            <Section
              title="Progression du sac"
              description="Faites avancer le sac dans le flux logistique."
            >
              <div className="space-y-3 px-5 py-4">
                {canClose && (
                  <div className="space-y-2">
                    <PrimaryButton
                      onClick={handleCloseBag}
                      loading={closeBag.isPending}
                      disabled={!hasParcels || isMutating}
                    >
                      Fermer le sac
                    </PrimaryButton>
                    {!hasParcels && (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        Ajoutez au moins un colis avant de fermer ce sac.
                      </p>
                    )}
                  </div>
                )}

                {canMarkDepartAirport && (
                  <PrimaryButton
                    tone="violet"
                    onClick={handleDepartAirport}
                    loading={updateBagStatus.isPending}
                    disabled={isMutating}
                  >
                    Marquer « En vol »
                  </PrimaryButton>
                )}

                {canMarkArrived && (
                  <PrimaryButton
                    tone="emerald"
                    icon={Check}
                    onClick={handleArrived}
                    loading={updateBagStatus.isPending}
                    disabled={isMutating}
                  >
                    Confirmer l'arrivée
                  </PrimaryButton>
                )}
              </div>
            </Section>
          )}

          {/* Alerte groupée */}
          {canAlert && (
            <Section
              title="Alerte groupée"
              description={`Notifier les ${parcels.length} client${parcels.length > 1 ? 's' : ''} du sac par email et SMS.`}
              icon={AlertTriangle}
            >
              <div className="space-y-3 px-5 py-4">
                {!showAlert ? (
                  <GhostButton
                    tone="danger"
                    icon={AlertTriangle}
                    onClick={() => setShowAlert(true)}
                    disabled={isMutating}
                  >
                    Rédiger une alerte
                  </GhostButton>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={alertMsg}
                      onChange={(e) => setAlertMsg(e.target.value)}
                      placeholder="Ex : Retard douanier, livraison reportée…"
                      rows={3}
                      className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <GhostButton
                        type="button"
                        onClick={() => {
                          setShowAlert(false)
                          setAlertMsg('')
                        }}
                      >
                        Annuler
                      </GhostButton>
                      <button
                        type="button"
                        onClick={() => alertMsg.trim() && sendAlert.mutate(alertMsg)}
                        disabled={!alertMsg.trim() || sendAlert.isPending}
                        className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-medium text-white transition hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {sendAlert.isPending ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        ) : null}
                        Envoyer à {parcels.length} client
                        {parcels.length > 1 ? 's' : ''}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Colis disponibles — sac ouvert */}
          {bag?.status === 'ouvert' && (
            <Section
              title="Colis disponibles"
              description="Colis individuels sans sac, disponibles à l'assignation."
            >
              <div className="space-y-3 px-5 py-4">
                {/* Recherche */}
                <div className="relative">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchAvailable}
                    onChange={(e) => setSearchAvailable(e.target.value)}
                    placeholder="Rechercher un colis…"
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-8 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  {searchAvailable && (
                    <button
                      type="button"
                      onClick={() => setSearchAvailable('')}
                      className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Effacer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {availableParcels.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-14 animate-pulse rounded-lg bg-slate-100"
                      />
                    ))}
                  </div>
                ) : availableFiltered.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Package size={14} />
                    </div>
                    <p className="text-xs text-slate-500">
                      {searchAvailable
                        ? 'Aucun colis ne correspond à la recherche.'
                        : 'Aucun colis individuel en attente.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Bandeau poids sélectionné */}
                    {selectedParcels.size > 0 && (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                        <span className="font-medium text-slate-600">
                          {selectedParcels.size} colis sélectionné
                          {selectedParcels.size > 1 ? 's' : ''}
                        </span>
                        <span className="font-semibold tabular-nums text-slate-900">
                          {selectedWeightKg.toFixed(1).replace(/\.0$/, '')} kg
                        </span>
                      </div>
                    )}

                    <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                      {availableFiltered.map((p) => {
                        const checked = selectedParcels.has(p.id)
                        return (
                          <label
                            key={p.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
                              checked
                                ? 'border-slate-900 bg-slate-50'
                                : 'border-slate-200 bg-white hover:bg-slate-50/70'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setSelectedParcels((prev) => {
                                  const next = new Set(prev)
                                  next.has(p.id) ? next.delete(p.id) : next.add(p.id)
                                  return next
                                })
                              }
                              className="h-4 w-4 accent-slate-900"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-mono text-sm font-medium text-slate-900">
                                {p.qrcode}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                {p.sender?.name || '?'} → {p.recipientName || '?'}
                                {p.weight ? ` · ${p.weight} kg` : ''}
                              </p>
                            </div>
                          </label>
                        )
                      })}
                    </div>

                    <PrimaryButton
                      icon={Package}
                      onClick={() => {
                        const ids = [...selectedParcels]
                        if (ids.length === 0) return
                        addParcelsMutation.mutate(ids)
                      }}
                      disabled={selectedParcels.size === 0}
                      loading={addParcelsMutation.isPending}
                    >
                      Ajouter {selectedParcels.size > 0 ? `(${selectedParcels.size})` : ''} au sac
                    </PrimaryButton>
                  </>
                )}
              </div>
            </Section>
          )}

          {/* Liste des colis du sac */}
          <Section
            title="Colis dans ce sac"
            description={
              bag?.weight
                ? `${parcels.length} colis · ${bag.weight} kg`
                : `${parcels.length} colis`
            }
          >
            {parcels.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Package size={14} />
                </div>
                <p className="text-xs text-slate-500">
                  Aucun colis dans ce sac pour le moment.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {parcels.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/parcels/${p.id}`)}
                      className="cursor-pointer px-4 py-3.5 transition hover:bg-slate-50/70"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-medium text-slate-900">
                          {p.qrcode}
                        </span>
                        <StatusBadge status={p.status} updatedAt={p.updatedAt} />
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {p.sender?.name ?? '—'} → {p.recipientName ?? '—'}
                        {p.weight ? ` · ${p.weight} kg` : ''}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Desktop */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-2.5 text-left font-medium">Code</th>
                        <th className="px-4 py-2.5 text-left font-medium">Expéditeur</th>
                        <th className="px-4 py-2.5 text-left font-medium">Destinataire</th>
                        <th className="px-4 py-2.5 text-right font-medium">Poids</th>
                        <th className="px-4 py-2.5 text-left font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parcels.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => navigate(`/parcels/${p.id}`)}
                          className="cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70"
                        >
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-sm font-medium text-slate-900">
                              {p.qrcode}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-700">
                            {p.sender?.name ?? '—'}
                          </td>
                          <td className="px-4 py-3.5 text-slate-700">
                            {p.recipientName ?? '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right tabular-nums text-slate-600">
                            {p.weight ? `${p.weight} kg` : '—'}
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={p.status} updatedAt={p.updatedAt} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Section>
        </div>

        {/* Colonne latérale */}
        <aside className="flex flex-col gap-5">
          <Section
            title="Étiquette & QR code"
            icon={QrCode}
            description="À imprimer et coller sur le sac."
          >
            <div className="flex flex-col items-center gap-4 px-5 py-5">
              {qrUrl ? (
                <>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <img src={qrUrl} alt={bag.qrcode} className="h-40 w-40" />
                  </div>

                  <BagLabelPrinter
                    code={bag.qrcode}
                    qrcodeUrl={qrUrl}
                    parcelCount={parcels.length}
                    weight={bag.weight}
                    date={new Date(bag.createdAt)
                      .toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                      .replace('.', '')}
                    className="w-full max-w-xs"
                  />

                  <a
                    href={qrUrl}
                    download={`${bag.qrcode}.png`}
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
        </aside>
      </div>
    </div>
  )
}