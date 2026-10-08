// src/pages/invoices/ShowInvoice.jsx

import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import {
  ArrowLeft,
  FileText,
  Mail,
  Trash2,
  Save,
  Send,
  Loader2,
  Download,
  CheckCircle2,
  AlertCircle,
  Euro,
} from 'lucide-react'

import Card from '../../components/ui/Card'

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
// Configuration statuts
// ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  draft: {
    label: 'Brouillon',
    color:
      'bg-slate-100 text-slate-700 border-slate-200',
  },

  paid: {
    label: 'Payé',
    color:
      'bg-emerald-100 text-emerald-700 border-emerald-200',
  },

  partially_paid: {
    label: 'Partiellement payé',
    color:
      'bg-amber-100 text-amber-700 border-amber-200',
  },

  overdue: {
    label: 'En retard',
    color:
      'bg-red-100 text-red-700 border-red-200',
  },
}

const STATUS_OPTIONS = Object.entries(
  STATUS_CONFIG
).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}))

// ────────────────────────────────────────────────────────────
// Badge statut
// ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg =
    STATUS_CONFIG[status] ||
    STATUS_CONFIG.draft

  return (
    <span
      className={`
        inline-flex items-center
        px-2.5 py-1
        rounded-full
        text-xs font-medium
        border
        ${cfg.color}
      `}
    >
      {cfg.label}
    </span>
  )
}

// ────────────────────────────────────────────────────────────
// Ligne d'information
// ────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  mono = false,
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">
        {label}
      </span>

      <span
        className={`
          text-sm text-slate-800
          ${mono ? 'font-mono' : ''}
        `}
      >
        {value ?? '—'}
      </span>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Format montant
// ────────────────────────────────────────────────────────────

function formatAmount(
  value,
  currency = 'EUR'
) {
  return `${Number(value || 0).toLocaleString(
    'fr-FR',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )} ${currency}`
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────

export default function ShowFacture() {
  const { id } = useParams()
  const nav = useNavigate()

  const {
    data: inv,
    isLoading,
    refetch,
  } = useInvoice(id)

  const updateMutation =
    useUpdateInvoice()

  const deleteMutation =
    useDeleteInvoice()

  const sendMutation =
    useSendInvoiceEmail()

  // ────────────────────────────────────────────────────────
  // États facture
  // ────────────────────────────────────────────────────────

  const [status, setStatus] =
    useState('draft')

  const [total, setTotal] =
    useState('')

  const [notes, setNotes] =
    useState('')

  // ────────────────────────────────────────────────────────
  // États paiement
  // ────────────────────────────────────────────────────────

  const [senderPaid, setSenderPaid] =
    useState('0')

  const [recipientPaid, setRecipientPaid] =
    useState('0')

  const [markAsPaid, setMarkAsPaid] =
    useState(false)

  const [remainingPayer, setRemainingPayer] =
    useState('')

  // ────────────────────────────────────────────────────────
  // Email
  // ────────────────────────────────────────────────────────

  const [email, setEmail] =
    useState('')

  // ────────────────────────────────────────────────────────
  // Initialisation depuis la facture
  // ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!inv) return

    setStatus(
      inv.status || 'draft'
    )

    setTotal(
      inv.total != null
        ? String(inv.total)
        : '0'
    )

    setSenderPaid(
      inv.senderPaid != null
        ? String(inv.senderPaid)
        : '0'
    )

    setRecipientPaid(
      inv.recipientPaid != null
        ? String(inv.recipientPaid)
        : '0'
    )

    setNotes(
      inv.notes || ''
    )

    setEmail(
      inv.parcel?.sender?.email || ''
    )

    setMarkAsPaid(false)
    setRemainingPayer('')
  }, [inv])

  // ────────────────────────────────────────────────────────
  // Valeurs calculées
  // ────────────────────────────────────────────────────────

  const numericTotal =
    Number(total) || 0

  const numericSenderPaid =
    Number(senderPaid) || 0

  const numericRecipientPaid =
    Number(recipientPaid) || 0

  const currentPaid =
    numericSenderPaid +
    numericRecipientPaid

  const remainingAmount = Math.max(
    0,
    numericTotal - currentPaid
  )

  // ────────────────────────────────────────────────────────
  // Parts
  // ────────────────────────────────────────────────────────

  const senderShare =
    Number(inv?.senderShare) || 0

  const recipientShare =
    Number(inv?.recipientShare) || 0

  const senderRemainingCapacity =
    Math.max(
      0,
      senderShare - numericSenderPaid
    )

  const recipientRemainingCapacity =
    Math.max(
      0,
      recipientShare - numericRecipientPaid
    )

  // ────────────────────────────────────────────────────────
  // Lequel des payeurs peut payer tout le reste ?
  // ────────────────────────────────────────────────────────

  const senderCanPayRemaining =
    remainingAmount > 0 &&
    senderRemainingCapacity + 0.001 >=
      remainingAmount

  const recipientCanPayRemaining =
    remainingAmount > 0 &&
    recipientRemainingCapacity + 0.001 >=
      remainingAmount

  // ────────────────────────────────────────────────────────
  // Paiement final selon checkbox
  // ────────────────────────────────────────────────────────

  const finalPayment = useMemo(() => {
    let finalSenderPaid =
      numericSenderPaid

    let finalRecipientPaid =
      numericRecipientPaid

    if (
      markAsPaid &&
      remainingPayer &&
      remainingAmount > 0
    ) {
      if (remainingPayer === 'sender') {
        finalSenderPaid += remainingAmount
      }

      if (remainingPayer === 'recipient') {
        finalRecipientPaid += remainingAmount
      }
    }

    return {
      senderPaid: finalSenderPaid,
      recipientPaid: finalRecipientPaid,
      montantPaye:
        finalSenderPaid +
        finalRecipientPaid,
    }
  }, [
    numericSenderPaid,
    numericRecipientPaid,
    remainingAmount,
    markAsPaid,
    remainingPayer,
  ])

  // ────────────────────────────────────────────────────────
  // Statut calculé visuellement
  // ────────────────────────────────────────────────────────

  const calculatedPaymentStatus =
    finalPayment.montantPaye >=
    numericTotal - 0.001
      ? 'paid'
      : finalPayment.montantPaye > 0
        ? 'partially_paid'
        : status

  // ────────────────────────────────────────────────────────
  // PDF
  // ────────────────────────────────────────────────────────

  const pdfUrl =
    inv?.pdfPublicUrl ||
    (
      inv?.pdfUrl &&
      (
        inv.pdfUrl.startsWith('http')
          ? inv.pdfUrl
          : `${import.meta.env.VITE_BASE_API_URL}/api/supabase/public/${inv.pdfUrl}`
      )
    ) ||
    null

  // ────────────────────────────────────────────────────────
  // États mutations
  // ────────────────────────────────────────────────────────

  const isSaving =
    updateMutation.isPending

  const isSending =
    sendMutation.isPending

  const isDeleting =
    deleteMutation.isPending

  // ────────────────────────────────────────────────────────
  // Vérifications
  // ────────────────────────────────────────────────────────

  const totalBelowPaid =
    numericTotal + 0.001 <
    currentPaid

  const invalidTotal =
    !Number.isFinite(numericTotal) ||
    numericTotal < 0

  const cannotFullySettleWithOnePayer =
    remainingAmount > 0 &&
    !senderCanPayRemaining &&
    !recipientCanPayRemaining

  // ────────────────────────────────────────────────────────
  // Checkbox paiement complet
  // ────────────────────────────────────────────────────────

  const handleMarkAsPaidChange = (
    checked
  ) => {
    setMarkAsPaid(checked)

    if (!checked) {
      setRemainingPayer('')
      return
    }

    // Si un seul payeur peut prendre le reste,
    // on le sélectionne automatiquement.
    if (
      senderCanPayRemaining &&
      !recipientCanPayRemaining
    ) {
      setRemainingPayer('sender')
      return
    }

    if (
      recipientCanPayRemaining &&
      !senderCanPayRemaining
    ) {
      setRemainingPayer('recipient')
      return
    }

    // Sinon aucun choix automatique.
    setRemainingPayer('')
  }

  // ────────────────────────────────────────────────────────
  // Quand le payeur change
  // ────────────────────────────────────────────────────────

  const handleRemainingPayerChange = (
    value
  ) => {
    setRemainingPayer(value)
  }

  // ────────────────────────────────────────────────────────
  // Enregistrement
  // ────────────────────────────────────────────────────────

  const handleUpdate = async () => {
    if (!inv) return

    // ──────────────────────────────────────────────
    // Validation montant
    // ──────────────────────────────────────────────

    if (invalidTotal) {
      return showErrorAlert({
        title: 'Montant invalide',
        text:
          'Veuillez saisir un montant total valide.',
      })
    }

    if (totalBelowPaid) {
      return showErrorAlert({
        title: 'Montant impossible',
        text:
          `Le montant total ne peut pas être inférieur au montant déjà payé (${formatAmount(
            currentPaid,
            inv.currency
          )}).`,
      })
    }

    // ──────────────────────────────────────────────
    // Validation checkbox
    // ──────────────────────────────────────────────

    if (markAsPaid) {
      if (!remainingPayer) {
        return showErrorAlert({
          title: 'Payeur requis',
          text:
            'Veuillez indiquer qui a payé le reste.',
        })
      }

      if (
        remainingPayer === 'sender' &&
        !senderCanPayRemaining
      ) {
        return showErrorAlert({
          title: 'Paiement impossible',
          text:
            "L'expéditeur ne peut pas prendre en charge la totalité du reste selon sa part.",
        })
      }

      if (
        remainingPayer === 'recipient' &&
        !recipientCanPayRemaining
      ) {
        return showErrorAlert({
          title: 'Paiement impossible',
          text:
            'Le destinataire ne peut pas prendre en charge la totalité du reste selon sa part.',
        })
      }
    }

    // ──────────────────────────────────────────────
    // Valeurs finales
    // ──────────────────────────────────────────────

    const finalSenderPaid =
      finalPayment.senderPaid

    const finalRecipientPaid =
      finalPayment.recipientPaid

    // ──────────────────────────────────────────────
    // Vérifier si quelque chose a changé
    // ──────────────────────────────────────────────

    const statusChanged =
      status !== inv.status

    const totalChanged =
      numericTotal !==
      (Number(inv.total) || 0)

    const senderPaidChanged =
      finalSenderPaid !==
      (Number(inv.senderPaid) || 0)

    const recipientPaidChanged =
      finalRecipientPaid !==
      (Number(inv.recipientPaid) || 0)

    const notesChanged =
      (notes || '') !==
      (inv.notes || '')

    const nothingChanged =
      !statusChanged &&
      !totalChanged &&
      !senderPaidChanged &&
      !recipientPaidChanged &&
      !notesChanged

    if (nothingChanged) {
      return showErrorAlert({
        title: 'Aucun changement',
        text:
          'Aucune modification détectée.',
      })
    }

    // ──────────────────────────────────────────────
    // Payload
    // ──────────────────────────────────────────────

    const payload = {

      total: numericTotal,

      senderPaid:
        finalSenderPaid,

      recipientPaid:
        finalRecipientPaid,

      notes:
        notes.trim() || null,
        
    }

    try {
      await updateMutation.mutateAsync({
        id,
        data: payload,
      })

      // Reset états liés au règlement
      setMarkAsPaid(false)
      setRemainingPayer('')

      showSuccessAlert({
        title: 'Facture mise à jour',
        text:
          'Les informations ont été enregistrées.',
      })

      // Actualiser la page pour recalculer le statut
      await refetch()
      

    } catch (err) {
      console.error(err)

      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Impossible de mettre à jour la facture.'

      showErrorAlert({
        title: 'Échec',
        text: message,
      })
    }
  }

  // ────────────────────────────────────────────────────────
  // Envoi email
  // ────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (
      !email ||
      !/^\S+@\S+\.\S+$/.test(email)
    ) {
      return showErrorAlert({
        title: 'Email invalide',
        text:
          'Veuillez saisir une adresse email valide.',
      })
    }

    try {
      await sendMutation.mutateAsync({
        id,
        data: {
          to: email,
          attach: true,
        },
      })

      showSuccessAlert({
        title: 'Email envoyé',
        text: `La facture a été envoyée à ${email}.`,
      })
    } catch (err) {
      console.error(err)

      showErrorAlert({
        title: 'Erreur envoi',
        text:
          "L'email n'a pas pu être envoyé.",
      })
    }
  }

  // ────────────────────────────────────────────────────────
  // Suppression
  // ────────────────────────────────────────────────────────

  const handleDelete = async () => {
    const ok =
      await confirmDeleteAlert({
        message:
          `Supprimer définitivement la facture ${inv?.number} ?`,
      })

    if (!ok) return

    try {
      await deleteMutation.mutateAsync(id)

      showSuccessAlert({
        title: 'Facture supprimée',
      })

      nav('/invoices')
    } catch (err) {
      console.error(err)

      showErrorAlert({
        title: 'Échec suppression',
      })
    }
  }

  // ────────────────────────────────────────────────────────
  // Loading
  // ────────────────────────────────────────────────────────

  if (isLoading || !inv) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2
          className="animate-spin mr-2"
          size={18}
        />

        Chargement de la facture...
      </div>
    )
  }

  // ────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ═══════════════════════════════════════════════════ */}
      {/* EN-TÊTE */}
      {/* ═══════════════════════════════════════════════════ */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        <div className="flex items-center gap-3">

          <button
            onClick={() => nav('/invoices')}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition"
            title="Retour"
          >
            <ArrowLeft size={18} />
          </button>

          <div>

            <div className="flex items-center gap-3">

              <h1 className="text-2xl font-bold text-slate-800">
                Facture{' '}
                <span className="font-mono text-violet-600">
                  #{inv.number}
                </span>
              </h1>

              <StatusBadge
                status={
                  markAsPaid
                    ? calculatedPaymentStatus
                    : inv.status
                }
              />

            </div>

            <p className="text-sm text-slate-500 mt-1">
              Créée le{' '}
              {new Date(
                inv.createdAt
              ).toLocaleDateString(
                'fr-FR',
                {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                }
              )}
            </p>

          </div>

        </div>

          <a
            href={`/parcels/${inv.parcelId}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
          >
            
            Retour au colis
          </a>
      

      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* CONTENU */}
      {/* ═══════════════════════════════════════════════════ */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ════════════════════════════════════════════════ */}
        {/* PDF */}
        {/* ════════════════════════════════════════════════ */}

        <div className="lg:col-span-2">

          <Card className="p-6 h-full">

            <div className="flex items-center justify-between mb-4">

              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <FileText
                  size={14}
                  className="text-violet-600"
                />

                Aperçu du PDF
              </h2>

              {pdfUrl && (
                <span className="text-xs text-slate-400 truncate max-w-[200px]">
                  facture-{inv.number}.pdf
                </span>
              )}

            </div>

            {pdfUrl ? (

              <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">

                <iframe
                  src={pdfUrl}
                  className="w-full h-[750px]"
                  title={`Facture ${inv.number}`}
                />

              </div>

            ) : (

              <div className="flex flex-col items-center justify-center py-20 text-center">

                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">

                  <FileText
                    size={28}
                    className="text-slate-400"
                  />

                </div>

                <p className="text-sm font-medium text-slate-600">
                  Aucun PDF disponible
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  Le PDF n'a pas encore été généré pour cette facture.
                </p>

              </div>

            )}

          </Card>

        </div>

        {/* ════════════════════════════════════════════════ */}
        {/* COLONNE DROITE */}
        {/* ════════════════════════════════════════════════ */}

        <div className="lg:col-span-1 space-y-6">

          {/* ══════════════════════════════════════════════ */}
          {/* ACTIONS */}
          {/* ══════════════════════════════════════════════ */}

          <Card className="p-6">

            <h2 className="text-sm font-semibold text-slate-700 mb-5">
              Actions
            </h2>

            {/* ─────────────────────────────────────────── */}
            {/* STATUT */}
            {/* ─────────────────────────────────────────── */}

            <div className="space-y-2">

              <label className="text-xs font-medium text-slate-600">
                Statut de la facture
              </label>

              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value)
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
              >
                {STATUS_OPTIONS.map(
                  (opt) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                    >
                      {opt.label}
                    </option>
                  )
                )}
              </select>

            </div>

            {/* ─────────────────────────────────────────── */}
            {/* MONTANT TOTAL */}
            {/* ─────────────────────────────────────────── */}

            <div className="mt-4 space-y-2">

              <label className="text-xs font-medium text-slate-600">
                Montant total
              </label>

              <div className="relative">

                <Euro
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={total}
                  onChange={(e) =>
                    setTotal(e.target.value)
                  }
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
                />

              </div>

              {totalBelowPaid && (
                <div className="flex items-start gap-2 text-xs text-red-600">

                  <AlertCircle
                    size={14}
                    className="mt-0.5 shrink-0"
                  />

                  <span>
                    Le montant total ne peut pas être inférieur au montant déjà payé.
                  </span>

                </div>
              )}

            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* PAIEMENT */}
            {/* ═══════════════════════════════════════════ */}

            <div className="mt-6 pt-5 border-t border-slate-100">

              <div className="flex items-center justify-between mb-3">

                <h3 className="text-sm font-semibold text-slate-700">
                  Paiement
                </h3>

                {currentPaid > 0 && (
                  <CheckCircle2
                    size={16}
                    className={
                      remainingAmount <= 0
                        ? 'text-emerald-500'
                        : 'text-amber-500'
                    }
                  />
                )}

              </div>

              {/* Total */}
              <div className="p-3 bg-slate-50 rounded-lg space-y-2">

                <div className="flex items-center justify-between">

                  <span className="text-xs text-slate-500">
                    Total facture
                  </span>

                  <span className="text-sm font-semibold text-slate-800">
                    {formatAmount(
                      numericTotal,
                      inv.currency
                    )}
                  </span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-xs text-slate-500">
                    Déjà payé
                  </span>

                  <span className="text-sm font-medium text-emerald-600">
                    {formatAmount(
                      currentPaid,
                      inv.currency
                    )}
                  </span>

                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">

                  <span className="text-xs font-medium text-slate-600">
                    Reste à payer
                  </span>

                  <span
                    className={`
                      text-sm font-bold
                      ${
                        remainingAmount > 0
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }
                    `}
                  >
                    {formatAmount(
                      remainingAmount,
                      inv.currency
                    )}
                  </span>

                </div>

              </div>

              {/* ─────────────────────────────────────── */}
              {/* Répartition actuelle */}
              {/* ─────────────────────────────────────── */}

              <div className="mt-3 space-y-1.5">

                <div className="flex items-center justify-between text-xs">

                  <span className="text-slate-500">
                    Expéditeur
                  </span>

                  <span className="text-slate-700">
                    {formatAmount(
                      numericSenderPaid,
                      inv.currency
                    )}
                    {' / '}
                    {formatAmount(
                      senderShare,
                      inv.currency
                    )}
                  </span>

                </div>

                <div className="flex items-center justify-between text-xs">

                  <span className="text-slate-500">
                    Destinataire
                  </span>

                  <span className="text-slate-700">
                    {formatAmount(
                      numericRecipientPaid,
                      inv.currency
                    )}
                    {' / '}
                    {formatAmount(
                      recipientShare,
                      inv.currency
                    )}
                  </span>

                </div>

              </div>

              {/* ─────────────────────────────────────── */}
              {/* Facture entièrement réglée */}
              {/* ─────────────────────────────────────── */}

              {remainingAmount > 0 && (
                <div className="mt-4">

                  <label
                    className={`
                      flex items-start gap-3
                      p-3
                      rounded-lg
                      border
                      cursor-pointer
                      transition
                      ${
                        cannotFullySettleWithOnePayer
                          ? 'bg-slate-50 border-slate-200 cursor-not-allowed'
                          : markAsPaid
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                      }
                    `}
                  >

                    <input
                      type="checkbox"
                      checked={markAsPaid}
                      disabled={
                        cannotFullySettleWithOnePayer
                      }
                      onChange={(e) =>
                        handleMarkAsPaidChange(
                          e.target.checked
                        )
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />

                    <div>

                      <p className="text-sm font-medium text-slate-700">
                        Facture entièrement réglée
                      </p>

                      <p className="text-xs text-slate-500 mt-0.5">
                        Les{' '}
                        {formatAmount(
                          remainingAmount,
                          inv.currency
                        )}{' '}
                        restants seront ajoutés au paiement.
                      </p>

                    </div>

                  </label>

                </div>
              )}

              {/* ─────────────────────────────────────── */}
              {/* Aucun payeur capable */}
              {/* ─────────────────────────────────────── */}

              {cannotFullySettleWithOnePayer && (
                <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">

                  <div className="flex items-start gap-2">

                    <AlertCircle
                      size={15}
                      className="text-amber-600 mt-0.5 shrink-0"
                    />

                    <p className="text-xs text-amber-700">
                      Aucun des deux payeurs ne peut prendre en charge seul la totalité du reste selon la répartition actuelle.
                    </p>

                  </div>

                </div>
              )}

              {/* ─────────────────────────────────────── */}
              {/* Qui a payé le reste ? */}
              {/* ─────────────────────────────────────── */}

              {markAsPaid &&
                remainingAmount > 0 && (
                  <div className="mt-3 space-y-2">

                    <label className="text-xs font-medium text-slate-600">
                      Qui a payé le reste ?
                    </label>

                    <select
                      value={remainingPayer}
                      onChange={(e) =>
                        handleRemainingPayerChange(
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                    >

                      <option value="">
                        Sélectionner...
                      </option>

                      <option
                        value="sender"
                        disabled={
                          !senderCanPayRemaining
                        }
                      >
                        Expéditeur
                        {!senderCanPayRemaining
                          ? ' — part insuffisante'
                          : ''}
                      </option>

                      <option
                        value="recipient"
                        disabled={
                          !recipientCanPayRemaining
                        }
                      >
                        Destinataire
                        {!recipientCanPayRemaining
                          ? ' — part insuffisante'
                          : ''}
                      </option>

                    </select>

                    {remainingPayer && (
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">

                        <p className="text-xs text-emerald-700">

                          {remainingPayer ===
                          'sender'
                            ? "L'expéditeur"
                            : 'Le destinataire'}{' '}
                          règlera{' '}

                          <strong>
                            {formatAmount(
                              remainingAmount,
                              inv.currency
                            )}
                          </strong>
                          {' '}restants.

                        </p>

                      </div>
                    )}

                  </div>
                )}

              {/* ─────────────────────────────────────── */}
              {/* Paiement final aperçu */}
              {/* ─────────────────────────────────────── */}

              {markAsPaid &&
                remainingPayer && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">

                    <p className="text-xs font-medium text-slate-600 mb-2">
                      Après enregistrement
                    </p>

                    <div className="space-y-1">

                      <div className="flex justify-between text-xs">

                        <span className="text-slate-500">
                          Expéditeur
                        </span>

                        <span className="font-medium text-slate-700">
                          {formatAmount(
                            finalPayment.senderPaid,
                            inv.currency
                          )}
                        </span>

                      </div>

                      <div className="flex justify-between text-xs">

                        <span className="text-slate-500">
                          Destinataire
                        </span>

                        <span className="font-medium text-slate-700">
                          {formatAmount(
                            finalPayment.recipientPaid,
                            inv.currency
                          )}
                        </span>

                      </div>

                      <div className="flex justify-between text-xs pt-1 border-t border-slate-200">

                        <span className="font-medium text-slate-600">
                          Total payé
                        </span>

                        <span className="font-bold text-emerald-600">
                          {formatAmount(
                            finalPayment.montantPaye,
                            inv.currency
                          )}
                        </span>

                      </div>

                    </div>

                  </div>
                )}

            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* NOTE */}
            {/* ═══════════════════════════════════════════ */}

            <div className="mt-5 space-y-2">

              <label className="text-xs font-medium text-slate-600">
                Note
              </label>

              <textarea
                value={notes}
                onChange={(e) =>
                  setNotes(e.target.value)
                }
                rows={4}
                placeholder="Ajouter une note..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition resize-none"
              />

            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* ENREGISTRER */}
            {/* ═══════════════════════════════════════════ */}

            <button
              onClick={handleUpdate}
              disabled={
                isSaving ||
                invalidTotal ||
                totalBelowPaid
              }
              className="w-full mt-5 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >

              {isSaving ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <Save size={14} />
              )}

              {isSaving
                ? 'Enregistrement...'
                : 'Enregistrer les modifications'}

            </button>

            {/* ═══════════════════════════════════════════ */}
            {/* EMAIL */}
            {/* ═══════════════════════════════════════════ */}

            <hr className="my-5 border-slate-100" />

            <div className="space-y-2">

              <label className="text-xs font-medium text-slate-600">
                Envoyer par email
              </label>

              <div className="relative">

                <Mail
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="client@exemple.com"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                />

              </div>

              <button
                onClick={handleSend}
                disabled={
                  isSending || !email
                }
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >

                {isSending ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                ) : (
                  <Send size={14} />
                )}

                {isSending
                  ? 'Envoi...'
                  : 'Envoyer la facture'}

              </button>

            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* SUPPRESSION */}
            {/* ═══════════════════════════════════════════ */}

            <hr className="my-5 border-slate-100" />

            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 border border-red-200 disabled:opacity-50 transition"
            >

              {isDeleting ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <Trash2 size={14} />
              )}

              {isDeleting
                ? 'Suppression...'
                : 'Supprimer la facture'}

            </button>

          </Card>

          {/* ══════════════════════════════════════════════ */}
          {/* RÉSUMÉ */}
          {/* ══════════════════════════════════════════════ */}

          <Card className="p-6">

            <h2 className="text-sm font-semibold text-slate-700 mb-4">
              Résumé
            </h2>

            <div className="p-3 bg-slate-50 rounded-lg mb-3">

              <p className="text-xs text-slate-500 mb-1">
                Montant total
              </p>

              <p className="text-2xl font-bold text-slate-800">

                {Number(
                  inv.total
                ).toLocaleString(
                  'fr-FR',
                  {
                    minimumFractionDigits: 2,
                  }
                )}

                <span className="text-sm font-normal text-slate-500 ml-1">
                  {inv.currency}
                </span>

              </p>

            </div>

            <div>

              <InfoRow
                label="Colis"
                value={
                  inv.parcel?.qrcode
                }
                mono
              />

              <InfoRow
                label="Créée le"
                value={new Date(
                  inv.createdAt
                ).toLocaleDateString(
                  'fr-FR'
                )}
              />

              <InfoRow
                label="Sous-total HT"
                value={`${Number(
                  inv.subtotal
                ).toFixed(2)} ${
                  inv.currency
                }`}
              />

              <InfoRow
                label="TVA"
                value={`${Number(
                  inv.taxRate
                ).toFixed(2)} %`}
              />

              <InfoRow
                label="Montant payé"
                value={formatAmount(
                  inv.montantPaye,
                  inv.currency
                )}
              />

              <InfoRow
                label="Reste à payer"
                value={formatAmount(
                  Math.max(
                    0,
                    Number(inv.total) -
                      Number(
                        inv.montantPaye
                      )
                  ),
                  inv.currency
                )}
              />

            </div>

          </Card>

          {/* ══════════════════════════════════════════════ */}
          {/* DESTINATAIRE */}
          {/* ══════════════════════════════════════════════ */}

          {inv.parcel?.sender && (
            <Card className="p-6">

              <h2 className="text-sm font-semibold text-slate-700 mb-3">
                Destinataire
              </h2>

              <div className="space-y-1">

                <p className="text-sm font-medium text-slate-800">
                  {inv.parcel.sender.name}
                </p>

                <p className="text-xs text-slate-500">
                  {inv.parcel.sender.email}
                </p>

                {inv.parcel.sender.phone && (
                  <p className="text-xs text-slate-500">
                    {inv.parcel.sender.phone}
                  </p>
                )}

              </div>

            </Card>
          )}

        </div>

      </div>

    </div>
  )
}