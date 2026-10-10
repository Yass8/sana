// src/pages/invoices/ShowInvoice.jsx
import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Euro,
  FileText,
  Mail,
  Save,
  Send,
  Trash2,
} from 'lucide-react'
import {
  useInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useSendInvoiceEmail,
} from '../../hooks/useInvoices'
import {
  confirmDeleteAlert,
  showSuccessAlert,
  showErrorAlert,
} from '../../components/ui/SweetsAlert'

// ────────────────────────────────────────────────────────────
// Config statuts
// ────────────────────────────────────────────────────────────
const STATUS_META = {
  draft:          { label: 'Brouillon',           dot: 'bg-slate-400' },
  paid:           { label: 'Payée',               dot: 'bg-emerald-500' },
  partially_paid: { label: 'Partiellement payée', dot: 'bg-amber-500' },
  overdue:        { label: 'En retard',           dot: 'bg-rose-500' },
}

const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}))

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
const fmt = (value, currency = 'EUR') =>
  `${Number(value || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`

// ────────────────────────────────────────────────────────────
// Primitives
// ────────────────────────────────────────────────────────────
function StatusDot({ status = 'draft' }) {
  const meta = STATUS_META[status] || STATUS_META.draft
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

function Section({ title, description, icon: Icon, action, children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              {Icon ? <Icon size={14} className="text-slate-400" /> : null}
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 truncate text-xs text-slate-500">{description}</p>
            ) : null}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

function PrimaryButton({
  icon: Icon,
  loading,
  children,
  className = '',
  tone = 'default',
  ...props
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-600'
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

function GhostButton({
  icon: Icon,
  loading,
  children,
  className = '',
  tone = 'default',
  ...props
}) {
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

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span
        className={`truncate text-sm text-slate-800 ${
          mono ? 'font-mono text-xs' : ''
        }`}
      >
        {value ?? '—'}
      </span>
    </div>
  )
}

function FormInput({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      {Icon ? (
        <Icon
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      ) : null}
      <input
        {...props}
        className={`h-10 w-full rounded-lg border border-slate-300 bg-white ${
          Icon ? 'pl-9' : 'pl-3'
        } pr-3 text-sm text-slate-800 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900`}
      />
    </div>
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

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────
export default function ShowInvoice() {
  const { id } = useParams()
  const nav = useNavigate()

  const { data: inv, isLoading, refetch } = useInvoice(id)
  const updateMutation = useUpdateInvoice()
  const deleteMutation = useDeleteInvoice()
  const sendMutation = useSendInvoiceEmail()

  const [status, setStatus] = useState('draft')
  const [total, setTotal] = useState('')
  const [notes, setNotes] = useState('')
  const [senderPaid, setSenderPaid] = useState('0')
  const [recipientPaid, setRecipientPaid] = useState('0')
  const [markAsPaid, setMarkAsPaid] = useState(false)
  const [remainingPayer, setRemainingPayer] = useState('')
  const [email, setEmail] = useState('')

  // ── Init depuis la facture ────────────────────────────────
  useEffect(() => {
    if (!inv) return
    setStatus(inv.status || 'draft')
    setTotal(inv.total != null ? String(inv.total) : '0')
    setSenderPaid(inv.senderPaid != null ? String(inv.senderPaid) : '0')
    setRecipientPaid(inv.recipientPaid != null ? String(inv.recipientPaid) : '0')
    setNotes(inv.notes || '')
    setEmail(inv.parcel?.sender?.email || '')
    setMarkAsPaid(false)
    setRemainingPayer('')
  }, [inv])

  // ── Valeurs calculées ─────────────────────────────────────
  const numericTotal = Number(total) || 0
  const numericSenderPaid = Number(senderPaid) || 0
  const numericRecipientPaid = Number(recipientPaid) || 0
  const currentPaid = numericSenderPaid + numericRecipientPaid
  const remainingAmount = Math.max(0, numericTotal - currentPaid)

  const senderShare = Number(inv?.senderShare) || 0
  const recipientShare = Number(inv?.recipientShare) || 0
  const senderRemainingCapacity = Math.max(0, senderShare - numericSenderPaid)
  const recipientRemainingCapacity = Math.max(0, recipientShare - numericRecipientPaid)

  const senderCanPayRemaining =
    remainingAmount > 0 && senderRemainingCapacity + 0.001 >= remainingAmount
  const recipientCanPayRemaining =
    remainingAmount > 0 && recipientRemainingCapacity + 0.001 >= remainingAmount

  // ── Paiement final ────────────────────────────────────────
  const finalPayment = useMemo(() => {
    let finalSenderPaid = numericSenderPaid
    let finalRecipientPaid = numericRecipientPaid

    if (markAsPaid && remainingPayer && remainingAmount > 0) {
      if (remainingPayer === 'sender') finalSenderPaid += remainingAmount
      if (remainingPayer === 'recipient') finalRecipientPaid += remainingAmount
    }

    return {
      senderPaid: finalSenderPaid,
      recipientPaid: finalRecipientPaid,
      montantPaye: finalSenderPaid + finalRecipientPaid,
    }
  }, [numericSenderPaid, numericRecipientPaid, remainingAmount, markAsPaid, remainingPayer])

  const calculatedPaymentStatus =
    finalPayment.montantPaye >= numericTotal - 0.001
      ? 'paid'
      : finalPayment.montantPaye > 0
      ? 'partially_paid'
      : status

  // ── PDF ───────────────────────────────────────────────────
  const pdfUrl =
    inv?.pdfPublicUrl ||
    (inv?.pdfUrl &&
      (inv.pdfUrl.startsWith('http')
        ? inv.pdfUrl
        : `${import.meta.env.VITE_BASE_API_URL}/api/supabase/public/${inv.pdfUrl}`)) ||
    null

  const isSaving = updateMutation.isPending
  const isSending = sendMutation.isPending
  const isDeleting = deleteMutation.isPending

  const totalBelowPaid = numericTotal + 0.001 < currentPaid
  const invalidTotal = !Number.isFinite(numericTotal) || numericTotal < 0
  const cannotFullySettleWithOnePayer =
    remainingAmount > 0 && !senderCanPayRemaining && !recipientCanPayRemaining

  const handleMarkAsPaidChange = (checked) => {
    setMarkAsPaid(checked)
    if (!checked) {
      setRemainingPayer('')
      return
    }
    if (senderCanPayRemaining && !recipientCanPayRemaining) {
      setRemainingPayer('sender')
      return
    }
    if (recipientCanPayRemaining && !senderCanPayRemaining) {
      setRemainingPayer('recipient')
      return
    }
    setRemainingPayer('')
  }

  // ── Enregistrement ────────────────────────────────────────
  const handleUpdate = async () => {
    if (!inv) return

    if (invalidTotal) {
      return showErrorAlert({
        title: 'Montant invalide',
        text: 'Veuillez saisir un montant total valide.',
      })
    }

    if (totalBelowPaid) {
      return showErrorAlert({
        title: 'Montant impossible',
        text: `Le montant total ne peut pas être inférieur au montant déjà payé (${fmt(
          currentPaid,
          inv.currency
        )}).`,
      })
    }

    if (markAsPaid) {
      if (!remainingPayer) {
        return showErrorAlert({
          title: 'Payeur requis',
          text: 'Veuillez indiquer qui a payé le reste.',
        })
      }
      if (remainingPayer === 'sender' && !senderCanPayRemaining) {
        return showErrorAlert({
          title: 'Paiement impossible',
          text: "L'expéditeur ne peut pas prendre en charge la totalité du reste selon sa part.",
        })
      }
      if (remainingPayer === 'recipient' && !recipientCanPayRemaining) {
        return showErrorAlert({
          title: 'Paiement impossible',
          text: 'Le destinataire ne peut pas prendre en charge la totalité du reste selon sa part.',
        })
      }
    }

    const statusChanged = status !== inv.status
    const totalChanged = numericTotal !== (Number(inv.total) || 0)
    const senderPaidChanged = finalPayment.senderPaid !== (Number(inv.senderPaid) || 0)
    const recipientPaidChanged =
      finalPayment.recipientPaid !== (Number(inv.recipientPaid) || 0)
    const notesChanged = (notes || '') !== (inv.notes || '')

    const nothingChanged =
      !statusChanged &&
      !totalChanged &&
      !senderPaidChanged &&
      !recipientPaidChanged &&
      !notesChanged

    if (nothingChanged) {
      return showErrorAlert({
        title: 'Aucun changement',
        text: 'Aucune modification détectée.',
      })
    }

    const payload = {
      total: numericTotal,
      senderPaid: finalPayment.senderPaid,
      recipientPaid: finalPayment.recipientPaid,
      notes: notes.trim() || null,
    }

    try {
      await updateMutation.mutateAsync({ id, data: payload })
      setMarkAsPaid(false)
      setRemainingPayer('')
      showSuccessAlert({
        title: 'Facture mise à jour',
        text: 'Les informations ont été enregistrées.',
      })
      await refetch()
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Impossible de mettre à jour la facture.'
      showErrorAlert({ title: 'Échec', text: message })
    }
  }

  // ── Envoi email ───────────────────────────────────────────
  const handleSend = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return showErrorAlert({
        title: 'Email invalide',
        text: 'Veuillez saisir une adresse email valide.',
      })
    }
    try {
      await sendMutation.mutateAsync({ id, data: { to: email, attach: true } })
      showSuccessAlert({
        title: 'Email envoyé',
        text: `La facture a été envoyée à ${email}.`,
      })
    } catch {
      showErrorAlert({
        title: 'Erreur envoi',
        text: "L'email n'a pas pu être envoyé.",
      })
    }
  }

  // ── Suppression ───────────────────────────────────────────
  const handleDelete = async () => {
    const ok = await confirmDeleteAlert({
      message: `Supprimer définitivement la facture ${inv?.number} ?`,
    })
    if (!ok) return
    try {
      await deleteMutation.mutateAsync(id)
      showSuccessAlert({ title: 'Facture supprimée' })
      nav('/invoices')
    } catch {
      showErrorAlert({ title: 'Échec suppression' })
    }
  }

  // ── Loading ───────────────────────────────────────────────
  if (isLoading || !inv) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-5 pb-10">
        <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="h-[820px] animate-pulse rounded-xl bg-slate-100" />
          <div className="space-y-5">
            <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-52 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    )
  }

  // ── Rendu ─────────────────────────────────────────────────
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-10">
      {/* En-tête */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-500">
            <button
              type="button"
              onClick={() => nav('/invoices')}
              className="inline-flex items-center gap-1 transition hover:text-slate-800"
            >
              <ArrowLeft size={12} />
              Factures
            </button>
            <span className="text-slate-300">/</span>
            <span className="font-mono font-medium text-slate-900">
              #{inv.number}
            </span>
          </nav>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Facture
              <span className="ml-2 font-mono text-slate-500">#{inv.number}</span>
            </h1>
            <StatusDot status={markAsPaid ? calculatedPaymentStatus : inv.status} />
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Créée le{' '}
            {new Date(inv.createdAt).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pdfUrl ? (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Download size={14} />
              Télécharger
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => nav(`/parcels/${inv.parcelId}`)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Retour au colis
          </button>
        </div>
      </header>

      {/* Corps */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Colonne principale : PDF */}
        <Section
          title="Aperçu du PDF"
          icon={FileText}
          description={pdfUrl ? `facture-${inv.number}.pdf` : 'Aucun PDF généré'}
          className="self-start"
        >
          {pdfUrl ? (
            <div className="bg-slate-50 p-4">
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <iframe
                  src={pdfUrl}
                  className="h-[780px] w-full"
                  title={`Facture ${inv.number}`}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <FileText size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Aucun PDF disponible
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Le PDF n'a pas encore été généré pour cette facture.
                </p>
              </div>
            </div>
          )}
        </Section>

        {/* Colonne latérale */}
        <aside className="flex flex-col gap-5">
          {/* Résumé */}
          <Section title="Résumé">
            <div className="space-y-3 px-5 py-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Montant total
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                  {Number(inv.total || 0).toLocaleString('fr-FR', {
                    minimumFractionDigits: 2,
                  })}
                  <span className="ml-1 text-sm font-normal text-slate-400">
                    {inv.currency}
                  </span>
                </p>
              </div>

              <div>
                <InfoRow label="Colis" value={inv.parcel?.qrcode} mono />
                <InfoRow
                  label="Créée le"
                  value={new Date(inv.createdAt).toLocaleDateString('fr-FR')}
                />
                <InfoRow
                  label="Sous-total HT"
                  value={`${Number(inv.subtotal || 0).toFixed(2)} ${inv.currency}`}
                />
                <InfoRow
                  label="TVA"
                  value={`${Number(inv.taxRate || 0).toFixed(2)} %`}
                />
                <InfoRow
                  label="Montant payé"
                  value={fmt(inv.montantPaye, inv.currency)}
                />
                <InfoRow
                  label="Reste à payer"
                  value={fmt(
                    Math.max(
                      0,
                      Number(inv.total || 0) - Number(inv.montantPaye || 0)
                    ),
                    inv.currency
                  )}
                />
              </div>
            </div>
          </Section>

          {/* Émetteur */}
          {inv.parcel?.sender ? (
            <Section title="Émetteur">
              <div className="space-y-0.5 px-5 py-4">
                <p className="text-sm font-medium text-slate-900">
                  {inv.parcel.sender.name}
                </p>
                {inv.parcel.sender.email ? (
                  <p className="text-xs text-slate-500">
                    {inv.parcel.sender.email}
                  </p>
                ) : null}
                {inv.parcel.sender.phone ? (
                  <p className="text-xs text-slate-500">
                    {inv.parcel.sender.phone}
                  </p>
                ) : null}
              </div>
            </Section>
          ) : null}

          {/* Gestion */}
          <Section title="Gestion de la facture">
            <div className="space-y-4 px-5 py-4">
              {/* Statut */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Statut
                </label>
                <FormSelect
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </FormSelect>
              </div>

              {/* Montant */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Montant total
                </label>
                <FormInput
                  icon={Euro}
                  type="number"
                  min="0"
                  step="0.01"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                />
                {totalBelowPaid && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-rose-600">
                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                    Le montant total ne peut pas être inférieur au montant déjà
                    payé.
                  </p>
                )}
              </div>

              {/* Paiement */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">
                    Paiement
                  </span>
                  {currentPaid > 0 ? (
                    remainingAmount <= 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                        <CheckCircle2 size={11} />
                        Soldée
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium tabular-nums text-amber-600">
                        Reste {fmt(remainingAmount, inv.currency)}
                      </span>
                    )
                  ) : null}
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Total</span>
                    <span className="font-medium tabular-nums text-slate-800">
                      {fmt(numericTotal, inv.currency)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Déjà payé</span>
                    <span className="font-medium tabular-nums text-emerald-600">
                      {fmt(currentPaid, inv.currency)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                    <span className="font-medium text-slate-600">
                      Reste à payer
                    </span>
                    <span
                      className={`font-semibold tabular-nums ${
                        remainingAmount > 0
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {fmt(remainingAmount, inv.currency)}
                    </span>
                  </div>
                </div>

                {/* Répartition */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Expéditeur</span>
                    <span className="tabular-nums text-slate-700">
                      {fmt(numericSenderPaid, inv.currency)} /{' '}
                      {fmt(senderShare, inv.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Destinataire</span>
                    <span className="tabular-nums text-slate-700">
                      {fmt(numericRecipientPaid, inv.currency)} /{' '}
                      {fmt(recipientShare, inv.currency)}
                    </span>
                  </div>
                </div>

                {/* Checkbox « réglée » */}
                {remainingAmount > 0 && (
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
                      cannotFullySettleWithOnePayer
                        ? 'cursor-not-allowed border-slate-200 bg-slate-50'
                        : markAsPaid
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={markAsPaid}
                      disabled={cannotFullySettleWithOnePayer}
                      onChange={(e) =>
                        handleMarkAsPaidChange(e.target.checked)
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="text-xs font-medium text-slate-700">
                        Facture entièrement réglée
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Les {fmt(remainingAmount, inv.currency)} restants seront
                        ajoutés au paiement.
                      </p>
                    </div>
                  </label>
                )}

                {cannotFullySettleWithOnePayer && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <AlertCircle
                      size={13}
                      className="mt-0.5 shrink-0 text-amber-600"
                    />
                    <p className="text-[11px] text-amber-700">
                      Aucun payeur ne peut prendre en charge seul la totalité du
                      reste selon la répartition actuelle.
                    </p>
                  </div>
                )}

                {markAsPaid && remainingAmount > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-600">
                      Qui a payé le reste ?
                    </label>
                    <FormSelect
                      value={remainingPayer}
                      onChange={(e) => setRemainingPayer(e.target.value)}
                    >
                      <option value="">Sélectionner…</option>
                      <option value="sender" disabled={!senderCanPayRemaining}>
                        Expéditeur
                        {!senderCanPayRemaining ? ' — part insuffisante' : ''}
                      </option>
                      <option
                        value="recipient"
                        disabled={!recipientCanPayRemaining}
                      >
                        Destinataire
                        {!recipientCanPayRemaining ? ' — part insuffisante' : ''}
                      </option>
                    </FormSelect>
                  </div>
                )}

                {markAsPaid && remainingPayer && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      Après enregistrement
                    </p>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Expéditeur</span>
                        <span className="tabular-nums text-slate-700">
                          {fmt(finalPayment.senderPaid, inv.currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Destinataire</span>
                        <span className="tabular-nums text-slate-700">
                          {fmt(finalPayment.recipientPaid, inv.currency)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-1.5 text-xs">
                        <span className="font-medium text-slate-700">
                          Total payé
                        </span>
                        <span className="font-semibold tabular-nums text-emerald-600">
                          {fmt(finalPayment.montantPaye, inv.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Note interne
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Ajouter une note…"
                  className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <PrimaryButton
                icon={Save}
                loading={isSaving}
                onClick={handleUpdate}
                disabled={invalidTotal || totalBelowPaid}
              >
                {isSaving
                  ? 'Enregistrement…'
                  : 'Enregistrer les modifications'}
              </PrimaryButton>
            </div>

            {/* Email */}
            <div className="space-y-3 border-t border-slate-200 px-5 py-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Envoyer par email
                </label>
                <FormInput
                  icon={Mail}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@exemple.com"
                />
              </div>
              <PrimaryButton
                tone="emerald"
                icon={Send}
                loading={isSending}
                onClick={handleSend}
                disabled={!email}
              >
                {isSending ? 'Envoi…' : 'Envoyer la facture'}
              </PrimaryButton>
            </div>

            {/* Suppression */}
            <div className="border-t border-slate-200 px-5 py-4">
              <GhostButton
                tone="danger"
                icon={Trash2}
                loading={isDeleting}
                onClick={handleDelete}
              >
                {isDeleting ? 'Suppression…' : 'Supprimer la facture'}
              </GhostButton>
            </div>
          </Section>
        </aside>
      </div>
    </div>
  )
}