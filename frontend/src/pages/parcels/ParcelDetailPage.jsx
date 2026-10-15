// src/pages/parcels/ParcelDetailPage.jsx
// ═══════════════════════════════════════════════════════════════
// Page détail colis — fusion avec la vue facture
// ───────────────────────────────────────────────────────────────
// Layout task-first :
//   1. Header compact (code + statut + résumé + actions)
//   2. Détails colis repliables (fermés par défaut)
//   3. Sections interactives en haut (Facture, Actions, QR, Suivi)
//   4. Infos secondaires en bas (Gestion sac, Lien suivi)
//
// La facture s'ouvre dans une modal plein écran (?invoice=open)
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Euro,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  Mail,
  Package,
  Pencil,
  QrCode,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useParcel, useUpdateParcelStatus } from '../../hooks/useParcels'
import { useBags } from '../../hooks/useBags'
import {
  useInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useSendInvoiceEmail,
} from '../../hooks/useInvoices'
import { parcelsApi } from '../../api/parcels.api'
import TrackingTimeline from '../../components/ui/TrackingTimeline'
import StatusBadge from '../../components/ui/StatusBadge'
import DeleteButton from '../../components/ui/DeleteButton'
import { ParcelLabelPrinter } from '../../components/ui/ParcelLabelPrinter'
import {
  confirmActionAlert,
  confirmDeleteAlert,
  showSuccessAlert,
  showErrorAlert,
} from '../../components/ui/SweetsAlert'

const BASE_API_URL = import.meta.env.VITE_BASE_API_URL

// ────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────
const INVOICE_STATUS_CONFIG = {
  paid:           { label: 'Payée',               dot: 'bg-emerald-500', tone: 'text-emerald-700' },
  partially_paid: { label: 'Partiellement payée', dot: 'bg-amber-500',   tone: 'text-amber-700' },
  draft:          { label: 'Brouillon',           dot: 'bg-slate-400',   tone: 'text-slate-700' },
  overdue:        { label: 'En retard',           dot: 'bg-rose-500',    tone: 'text-rose-700' },
  none:           { label: 'Aucune facture',      dot: 'bg-slate-300',   tone: 'text-slate-500' },
}

const INVOICE_STATUS_OPTIONS = ['draft', 'partially_paid', 'paid', 'overdue'].map((v) => ({
  value: v,
  label: INVOICE_STATUS_CONFIG[v].label,
}))

const fmtMoney = (value, currency = 'EUR') =>
  `${Number(value || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`

// ═══════════════════════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════════════════════

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

/**
 * Bloc repliable des détails du colis.
 * Fermé par défaut → place aux actions en premier.
 */
function CollapsibleParcelDetails({ parcel }) {
  const [open, setOpen] = useState(false)

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50/60"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Package size={13} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Détails du colis
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Destinataire, contact, service, options…
            </p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open ? (
        <div className="border-t border-slate-200">
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
        </div>
      ) : null}
    </section>
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

function Skeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 pb-10">
      <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
      <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
      <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
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
// INVOICE SUMMARY CARD (sidebar / colonne principale)
// ═══════════════════════════════════════════════════════════

function InvoiceSummaryCard({ invoice, onOpen }) {
  if (!invoice) {
    return (
      <Section title="Facture" icon={FileText}>
        <div className="px-5 py-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <FileText size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Aucune facture</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Ce colis n'a pas encore été facturé.
              </p>
            </div>
          </div>
        </div>
      </Section>
    )
  }

  const cfg = INVOICE_STATUS_CONFIG[invoice.status] || INVOICE_STATUS_CONFIG.draft
  const total = Number(invoice.total || 0)
  const paid = Number(invoice.montantPaye || 0)
  const remaining = Math.max(0, total - paid)

  return (
    <Section
      title="Facture"
      icon={FileText}
      action={
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      }
    >
      <div className="space-y-3 px-5 py-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-medium text-slate-600">
              #{invoice.number}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Total
            </span>
          </div>
          <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
            {fmtMoney(total, invoice.currency)}
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Payé</span>
            <span className="font-medium tabular-nums text-emerald-600">
              {fmtMoney(paid, invoice.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Reste à payer</span>
            <span
              className={`font-semibold tabular-nums ${
                remaining > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {fmtMoney(remaining, invoice.currency)}
            </span>
          </div>
        </div>

        <PrimaryButton type="button" icon={FileText} onClick={onOpen}>
          Voir la facture
        </PrimaryButton>
      </div>
    </Section>
  )
}

// ═══════════════════════════════════════════════════════════
// INVOICE DETAIL MODAL
// ═══════════════════════════════════════════════════════════

function InvoiceDetailModal({ invoiceId, parcelId, open, onClose }) {
  if (!open) return null
  return (
    <InvoiceDetailModalContent
      invoiceId={invoiceId}
      parcelId={parcelId}
      onClose={onClose}
    />
  )
}

function InvoiceDetailModalContent({ invoiceId, parcelId, onClose }) {
  const queryClient = useQueryClient()

  const { data: inv, isLoading, refetch } = useInvoice(invoiceId)
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

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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

  const pdfUrl =
    inv?.pdfPublicUrl ||
    (inv?.pdfUrl &&
      (inv.pdfUrl.startsWith('http')
        ? inv.pdfUrl
        : `${BASE_API_URL}/api/supabase/public/${inv.pdfUrl}`)) ||
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
        text: `Le montant total ne peut pas être inférieur au montant déjà payé (${fmtMoney(currentPaid, inv.currency)}).`,
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
    const recipientPaidChanged = finalPayment.recipientPaid !== (Number(inv.recipientPaid) || 0)
    const notesChanged = (notes || '') !== (inv.notes || '')

    const nothingChanged =
      !statusChanged && !totalChanged && !senderPaidChanged &&
      !recipientPaidChanged && !notesChanged

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
      await updateMutation.mutateAsync({ id: invoiceId, data: payload })
      setMarkAsPaid(false)
      setRemainingPayer('')
      queryClient.invalidateQueries({ queryKey: ['parcel', parcelId] })
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

  const handleSend = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return showErrorAlert({
        title: 'Email invalide',
        text: 'Veuillez saisir une adresse email valide.',
      })
    }
    try {
      await sendMutation.mutateAsync({ id: invoiceId, data: { to: email, attach: true } })
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

  const handleDelete = async () => {
    const ok = await confirmDeleteAlert({
      message: `Supprimer définitivement la facture ${inv?.number} ?`,
    })
    if (!ok) return
    try {
      await deleteMutation.mutateAsync(invoiceId)
      queryClient.invalidateQueries({ queryKey: ['parcel', parcelId] })
      showSuccessAlert({ title: 'Facture supprimée' })
      onClose()
    } catch {
      showErrorAlert({ title: 'Échec suppression' })
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
              Facture
              {inv?.number ? (
                <span className="font-mono text-slate-500">#{inv.number}</span>
              ) : null}
              {inv ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    (INVOICE_STATUS_CONFIG[markAsPaid ? calculatedPaymentStatus : inv.status] ||
                      INVOICE_STATUS_CONFIG.draft).dot
                  }`} />
                  {(INVOICE_STATUS_CONFIG[markAsPaid ? calculatedPaymentStatus : inv.status] ||
                    INVOICE_STATUS_CONFIG.draft).label}
                </span>
              ) : null}
            </h2>
            {inv ? (
              <p className="mt-0.5 text-xs text-slate-500">
                Créée le {new Date(inv.createdAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {pdfUrl ? (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
              >
                <Download size={14} />
                Télécharger
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {isLoading || !inv ? (
          <div className="flex flex-1 items-center justify-center p-10 text-sm text-slate-500">
            <Loader2 size={16} className="mr-2 animate-spin" />
            Chargement de la facture…
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
            {/* PDF */}
            <div className="order-last shrink-0 border-t border-slate-200 bg-slate-50 p-4 lg:order-first lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:border-t-0">
              {pdfUrl ? (
                <>
                  {/* Mobile : carte avec boutons (pas d'iframe) */}
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 lg:hidden mb-30 lg:mb-0">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <FileText size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-800">
                          Facture #{inv.number}
                        </p>
                        <p className="text-[10px] text-slate-500">PDF disponible</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white transition hover:bg-slate-800"
                      >
                        <ExternalLink size={12} />
                        Ouvrir
                      </a>
                      <a
                        href={pdfUrl}
                        download
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50"
                        aria-label="Télécharger"
                      >
                        <Download size={13} />
                      </a>
                    </div>
                  </div>

                  {/* Desktop : iframe */}
                  <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white lg:block">
                    <iframe
                      src={pdfUrl}
                      className="h-full min-h-[600px] w-full"
                      title={`Facture ${inv.number}`}
                    />
                  </div>
                </>
              ) : (
                <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
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
            </div>

            {/* Édition */}
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 lg:w-96 lg:flex-none">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Statut
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  {INVOICE_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Montant total
                </label>
                <div className="relative">
                  <Euro
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={total}
                    onChange={(e) => setTotal(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm tabular-nums text-slate-800 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                {totalBelowPaid ? (
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-rose-600">
                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                    Le montant total ne peut pas être inférieur au montant déjà payé.
                  </p>
                ) : null}
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">Paiement</span>
                  {currentPaid > 0 ? (
                    remainingAmount <= 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                        <CheckCircle2 size={11} />
                        Soldée
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium tabular-nums text-amber-600">
                        Reste {fmtMoney(remainingAmount, inv.currency)}
                      </span>
                    )
                  ) : null}
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Total</span>
                    <span className="font-medium tabular-nums text-slate-800">
                      {fmtMoney(numericTotal, inv.currency)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Déjà payé</span>
                    <span className="font-medium tabular-nums text-emerald-600">
                      {fmtMoney(currentPaid, inv.currency)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                    <span className="font-medium text-slate-600">Reste à payer</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        remainingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {fmtMoney(remainingAmount, inv.currency)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Expéditeur</span>
                    <span className="tabular-nums text-slate-700">
                      {fmtMoney(numericSenderPaid, inv.currency)} / {fmtMoney(senderShare, inv.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Destinataire</span>
                    <span className="tabular-nums text-slate-700">
                      {fmtMoney(numericRecipientPaid, inv.currency)} / {fmtMoney(recipientShare, inv.currency)}
                    </span>
                  </div>
                </div>

                {remainingAmount > 0 ? (
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
                      onChange={(e) => handleMarkAsPaidChange(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="text-xs font-medium text-slate-700">
                        Facture entièrement réglée
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Les {fmtMoney(remainingAmount, inv.currency)} restants seront ajoutés au paiement.
                      </p>
                    </div>
                  </label>
                ) : null}

                {cannotFullySettleWithOnePayer ? (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-600" />
                    <p className="text-[11px] text-amber-700">
                      Aucun payeur ne peut prendre en charge seul la totalité du reste selon la répartition actuelle.
                    </p>
                  </div>
                ) : null}

                {markAsPaid && remainingAmount > 0 ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-600">
                      Qui a payé le reste ?
                    </label>
                    <select
                      value={remainingPayer}
                      onChange={(e) => setRemainingPayer(e.target.value)}
                      className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="">Sélectionner…</option>
                      <option value="sender" disabled={!senderCanPayRemaining}>
                        Expéditeur{!senderCanPayRemaining ? ' — part insuffisante' : ''}
                      </option>
                      <option value="recipient" disabled={!recipientCanPayRemaining}>
                        Destinataire{!recipientCanPayRemaining ? ' — part insuffisante' : ''}
                      </option>
                    </select>
                  </div>
                ) : null}

                {markAsPaid && remainingPayer ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      Après enregistrement
                    </p>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Expéditeur</span>
                        <span className="tabular-nums text-slate-700">
                          {fmtMoney(finalPayment.senderPaid, inv.currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Destinataire</span>
                        <span className="tabular-nums text-slate-700">
                          {fmtMoney(finalPayment.recipientPaid, inv.currency)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-1.5 text-xs">
                        <span className="font-medium text-slate-700">Total payé</span>
                        <span className="font-semibold tabular-nums text-emerald-600">
                          {fmtMoney(finalPayment.montantPaye, inv.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

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
                {isSaving ? 'Enregistrement…' : 'Enregistrer les modifications'}
              </PrimaryButton>

              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    Envoyer par email
                  </label>
                  <div className="relative">
                    <Mail
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="client@exemple.com"
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-800 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>
                <PrimaryButton
                  tone="emerald"
                  icon={Send}
                  loading={isSending}
                  onClick={handleSend}
                  disabled={!email}
                  className='bg-green-700'
                >
                  {isSending ? 'Envoi…' : 'Envoyer la facture'}
                </PrimaryButton>
              </div>

              <div className="border-t border-slate-200 pt-4 mb-0 lg:mb-0">
                <GhostButton
                  tone="danger"
                  icon={Trash2}
                  loading={isDeleting}
                  onClick={handleDelete}
                >
                  {isDeleting ? 'Suppression…' : 'Supprimer la facture'}
                </GhostButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════

export default function ParcelDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const updateStatus = useUpdateParcelStatus()

  const [alertReason, setAlertReason] = useState('')
  const [showAlert, setShowAlert] = useState(false)
  const [totalPieces, setTotalPieces] = useState(1)
  const [currentPiece, setCurrentPiece] = useState(1)
  const [selectedBagId, setSelectedBagId] = useState('')
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(
    () => searchParams.get('invoice') === 'open'
  )

  const { data: parcel, isLoading, isError } = useParcel(id)
  const { data: openBags = [], isLoading: loadingBags } = useBags({ status: 'ouvert' })
  const effectiveSelectedBagId = selectedBagId || parcel?.bagId || ''

  useEffect(() => {
    if (invoiceModalOpen && searchParams.get('invoice') !== 'open') {
      const next = new URLSearchParams(searchParams)
      next.set('invoice', 'open')
      setSearchParams(next, { replace: true })
    } else if (!invoiceModalOpen && searchParams.get('invoice') === 'open') {
      const next = new URLSearchParams(searchParams)
      next.delete('invoice')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceModalOpen])

  const invoice = parcel?.invoice || null
  const invoiceStatus = invoice?.status || 'none'
  const isInvoicePaid = invoiceStatus === 'paid'

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

  const canConfirmCollection =
    parcel?.status === 'arrived_destination' &&
    (user?.role === 'agent_af' || user?.role === 'admin')

  if (isLoading) return <Skeleton />

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

  // ═══════════════════════════════════════════════════════════
  // RENDU — Layout task-first
  // ═══════════════════════════════════════════════════════════
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

      {/* ─── Header compact ─── */}
      <header className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
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
              {parcel.recipientName ? (
                <span className="font-medium text-slate-700">
                  {parcel.recipientName}
                </span>
              ) : null}
              {parcel.weight ? (
                <>
                  {parcel.recipientName ? ' · ' : null}
                  <span className="tabular-nums">{parcel.weight} kg</span>
                </>
              ) : null}
              {' · '}
              Déposé le{' '}
              {new Date(parcel.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
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
      </header>

      {/* ─── Détails du colis (repliable, fermé par défaut) ─── */}
      <CollapsibleParcelDetails parcel={parcel} />

      {/* ─── Corps : sections interactives en premier ─── */}
      <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Colonne principale : workflow */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* 1. Actions sur le colis */}
          {!parcel.bagId ? (
            <Section title="Actions sur le colis">
              <div className="space-y-4 px-5 py-4">
                <InvoiceBanner
                  status={invoiceStatus}
                  invoiceId={invoice?.id}
                  onView={() => setInvoiceModalOpen(true)}
                />

                <div className="space-y-3">
                  {parcel.status === 'received' ? (
                    <PrimaryButton
                      onClick={handleDepartAirport}
                      loading={updateStatus.isPending}
                    >
                      Marquer « Parti de l'aéroport »
                    </PrimaryButton>
                  ) : null}

                  {parcel.status === 'departed_airport' ? (
                    <PrimaryButton
                      onClick={handleArrivedDestination}
                      loading={updateStatus.isPending}
                    >
                      Marquer « Arrivé à destination »
                    </PrimaryButton>
                  ) : null}

                  {canConfirmCollection ? (
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
                      {!isInvoicePaid ? (
                        <p className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                          <Lock size={12} className="mt-0.5 shrink-0" />
                          Le retrait ne peut être confirmé que si la facture est entièrement payée.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </Section>
          ) : null}

          {/* Confirmer retrait — colis en sac */}
          {canConfirmCollection && parcel.bagId ? (
            <Section title="Confirmer le retrait">
              <div className="space-y-4 px-5 py-4">
                <InvoiceBanner
                  status={invoiceStatus}
                  invoiceId={invoice?.id}
                  onView={() => setInvoiceModalOpen(true)}
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
                {!isInvoicePaid ? (
                  <p className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    <Lock size={12} className="mt-0.5 shrink-0" />
                    Le retrait ne peut être confirmé que si la facture est entièrement payée.
                  </p>
                ) : null}
              </div>
            </Section>
          ) : null}

          {/* Signaler un problème */}
          {parcel.status !== 'issue' ? (
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
          ) : null}

          {parcel.status === 'issue' ? (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600" />
              <div>
                <p className="text-sm font-semibold text-rose-800">Problème signalé</p>
                <p className="mt-0.5 text-xs text-rose-700">
                  Ce colis ne suivra pas le flux normal tant que le problème n'est pas résolu.
                </p>
              </div>
            </div>
          ) : null}

          {parcel.bagId ? (
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
              <Package size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Colis rattaché à un sac
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Les transitions de statut s'effectuent depuis la page du sac. Vous pouvez uniquement confirmer le retrait ou signaler un problème sur ce colis.
                </p>
              </div>
            </div>
          ) : null}

          {/* 2. Suivi du colis */}
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

          {/* 3. Gestion du sac */}
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
                {!loadingBags && openBags.length === 0 ? (
                  <p className="mt-1.5 text-xs text-slate-400">
                    Aucun sac ouvert disponible pour le moment.
                  </p>
                ) : null}
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
        </div>

        {/* Sidebar : facture + QR + lien suivi */}
        <aside className="flex min-w-0 flex-col gap-5">
          {/* Facture (résumé compact) */}
          <InvoiceSummaryCard
            invoice={invoice}
            onOpen={() => setInvoiceModalOpen(true)}
          />

          {/* Étiquette & QR code */}
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
                    recipientAddress={parcel.recipientAddress || 'Adresse non renseignée'}
                    recipientPhone={parcel.recipientPhone || 'Tél non renseigné'}
                    weight={parcel.weight || 0}
                    service={parcel.service || 'Standard'}
                    fragile={parcel.fragile || false}
                    urgent={parcel.urgent || false}
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

      {/* Modal facture */}
      {invoice ? (
        <InvoiceDetailModal
          invoiceId={invoice.id}
          parcelId={id}
          open={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
        />
      ) : null}
    </div>
  )
}