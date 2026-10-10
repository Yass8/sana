// src/pages/parcels/ParcelEditPage.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowLeft, Package, Save } from 'lucide-react'
import { parcelsApi } from '../../api/parcels.api'
import { useBags } from '../../hooks/useBags'
import {
  showSuccessAlert,
  showErrorAlert,
} from '../../components/ui/SweetsAlert'

// ────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────
const TYPES = [
  { value: 'client',    label: 'Dépôt par client' },
  { value: 'amazon',    label: 'Amazon' },
  { value: 'shein',     label: 'Shein' },
  { value: 'temu',      label: 'Temu' },
  { value: 'colissimo', label: 'Colissimo' },
  { value: 'chronopost',label: 'Chronopost' },
  { value: 'dhl',       label: 'DHL' },
  { value: 'ups',       label: 'UPS' },
  { value: 'fedex',     label: 'FedEx' },
  { value: 'autre',     label: 'Autre' },
]

// ────────────────────────────────────────────────────────────
// Primitives
// ────────────────────────────────────────────────────────────
function Section({ title, description, icon: Icon, children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      {(title || description) && (
        <header className="flex items-start gap-3 border-b border-slate-200 px-5 py-3.5">
          {Icon ? (
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Icon size={13} />
            </div>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            ) : null}
          </div>
        </header>
      )}
      {children}
    </section>
  )
}

function Field({ label, htmlFor, required, error, children }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-medium text-slate-600"
      >
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-rose-600">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  )
}

function FormInput({ invalid, ...props }) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
        invalid
          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
          : 'border-slate-300 focus:border-slate-900 focus:ring-slate-900'
      }`}
    />
  )
}

function FormSelect({ children, ...props }) {
  return (
    <div className="relative">
      <select
        {...props}
        className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-8 text-sm text-slate-800 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  )
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-slate-300 accent-slate-900 focus:ring-slate-900"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  )
}

function PrimaryButton({ icon: Icon, loading, children, ...props }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

function GhostButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
    >
      {children}
    </button>
  )
}

function InfoField({ label, value, mono = false }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 ${
          mono ? 'font-mono text-xs' : ''
        }`}
      >
        {value ?? '—'}
      </p>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────
export default function ParcelEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: parcel, isLoading } = useQuery({
    queryKey: ['parcel', id],
    queryFn: () => parcelsApi.getById(id),
  })

  const [selectedBagId, setSelectedBagId] = useState('')
  const { data: openBags = [], isLoading: loadingBags } = useBags({
    status: 'ouvert',
  })

  const bagMutation = useMutation({
    mutationFn: (bagId) => parcelsApi.update(id, { bagId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcel', id] })
      queryClient.invalidateQueries({ queryKey: ['parcels'] })
      showSuccessAlert({ text: 'Sac mis à jour avec succès.' })
    },
    onError: (err) => {
      showErrorAlert({
        text: err?.message || 'Erreur lors de la modification du sac.',
      })
    },
  })

  const handleRemoveBag = () => bagMutation.mutate(null)
  const handleAssignBag = () => {
    if (!selectedBagId) {
      showErrorAlert({ text: 'Veuillez sélectionner un sac.' })
      return
    }
    bagMutation.mutate(selectedBagId)
  }

  const [form, setForm] = useState({
    description: '',
    weight: '',
    recipientName: '',
    recipientPhone: '',
    recipientAddress: '',
    service: '',
    type: 'client',
    urgent: false,
    fragile: false,
  })

  useEffect(() => {
    if (parcel) {
      setForm({
        description: parcel.description ?? '',
        weight: parcel.weight ?? '',
        recipientName: parcel.recipientName ?? '',
        recipientPhone: parcel.recipientPhone ?? '',
        recipientAddress: parcel.recipientAddress ?? '',
        service: parcel.service ?? '',
        type: parcel.type ?? 'client',
        urgent: parcel.urgent ?? false,
        fragile: parcel.fragile ?? false,
      })
    }
  }, [parcel])

  const updateMutation = useMutation({
    mutationFn: (data) => parcelsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcel', id] })
      queryClient.invalidateQueries({ queryKey: ['parcels'] })
    },
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await updateMutation.mutateAsync({
        ...form,
        weight: form.weight ? parseFloat(form.weight) : null,
      })
      await showSuccessAlert({ text: 'Colis mis à jour avec succès.' })
      navigate(`/parcels/${id}`)
    } catch (err) {
      await showErrorAlert({
        text: err?.message || 'Impossible de mettre à jour le colis.',
      })
    }
  }

  // ── Loading ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-10">
        <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
        <div className="h-96 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
      </div>
    )
  }

  const isSubmitting = updateMutation.isPending

  // ── Rendu ─────────────────────────────────────────────────
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-10">
      {/* En-tête */}
      <header>
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => navigate(`/parcels/${id}`)}
            className="inline-flex items-center gap-1 transition hover:text-slate-800"
          >
            <ArrowLeft size={12} />
            Détails
          </button>
          <span className="text-slate-300">/</span>
          <span className="font-medium text-slate-700">Modifier</span>
        </nav>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Modifier le colis
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Mettez à jour les informations du colis{' '}
          <span className="font-mono text-slate-700">
            {parcel?.qrcode ?? ''}
          </span>
          .
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Informations en lecture seule */}
        <Section
          title="Informations du colis"
          description="Données système, non modifiables."
          icon={Package}
        >
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
            <InfoField label="Code QR" value={parcel?.qrcode} mono />
            <InfoField label="Statut actuel" value={parcel?.status} />
            <InfoField label="Expéditeur" value={parcel?.sender?.name} />
            <InfoField label="Sac" value={parcel?.bag?.qrcode} />
          </div>
        </Section>

        {/* Détails éditables */}
        <Section
          title="Destinataire & détails"
          description="Ces informations figurent sur l'étiquette et la facture."
        >
          <div className="space-y-4 px-5 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Destinataire"
                htmlFor="recipientName"
                required
              >
                <FormInput
                  id="recipientName"
                  name="recipientName"
                  value={form.recipientName}
                  onChange={handleChange}
                  required
                />
              </Field>

              <Field label="Téléphone destinataire" htmlFor="recipientPhone">
                <FormInput
                  id="recipientPhone"
                  name="recipientPhone"
                  value={form.recipientPhone}
                  onChange={handleChange}
                />
              </Field>

              <Field
                label="Adresse destinataire"
                htmlFor="recipientAddress"
              >
                <FormInput
                  id="recipientAddress"
                  name="recipientAddress"
                  value={form.recipientAddress}
                  onChange={handleChange}
                />
              </Field>

              <Field label="Poids (kg)" htmlFor="weight">
                <FormInput
                  id="weight"
                  name="weight"
                  type="number"
                  step="0.01"
                  value={form.weight}
                  onChange={handleChange}
                  className="tabular-nums"
                />
              </Field>
            </div>

            <Field label="Type de colis" htmlFor="type">
              <FormSelect
                id="type"
                name="type"
                value={form.type}
                onChange={handleChange}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </FormSelect>
            </Field>

            <Field label="Description" htmlFor="description">
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Contenu, particularités…"
                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </Field>

            <div className="flex flex-wrap items-center gap-5 border-t border-slate-100 pt-4">
              <Checkbox
                label="Urgent"
                checked={form.urgent}
                onChange={(e) =>
                  setForm((p) => ({ ...p, urgent: e.target.checked }))
                }
              />
              <Checkbox
                label="Fragile"
                checked={form.fragile}
                onChange={(e) =>
                  setForm((p) => ({ ...p, fragile: e.target.checked }))
                }
              />
            </div>
          </div>
        </Section>

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <GhostButton
            type="button"
            onClick={() => navigate(`/parcels/${id}`)}
            className="sm:w-auto"
          >
            Annuler
          </GhostButton>
          <PrimaryButton
            type="submit"
            icon={Save}
            loading={isSubmitting}
            className="sm:w-auto"
          >
            {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  )
}