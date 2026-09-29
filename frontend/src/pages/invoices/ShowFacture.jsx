import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, FileText, Package, DollarSign, Calendar,
  Mail, Trash2, Save, Send, Loader2, Download, User, Building2,
} from 'lucide-react'
import Card from '../../components/ui/Card'
import {
  useInvoice, useUpdateInvoice, useDeleteInvoice, useSendInvoiceEmail,
} from '../../hooks/useInvoices'
import {
  confirmDeleteAlert,
  showSuccessAlert,
  showErrorAlert,
} from '../../components/ui/SweetsAlert'

// ────────────────────────────────────────────────────────────
// Config statuts
// ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft:          { label: 'Brouillon',     color: 'bg-slate-100 text-slate-700 border-slate-200' },
  paid:           { label: 'Payé',          color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  partially_paid: { label: 'Partiellement', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  overdue:        { label: 'En retard',     color: 'bg-red-100 text-red-700 border-red-200' },
}

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}))

// ────────────────────────────────────────────────────────────
// Composant : Badge statut
// ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

// ────────────────────────────────────────────────────────────
// Composant : Ligne d'info
// ────────────────────────────────────────────────────────────
function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm text-slate-800 ${mono ? 'font-mono' : ''}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────
export default function ShowFacture() {
  const { id } = useParams()
  const nav = useNavigate()

  const { data: inv, isLoading, refetch } = useInvoice(id)
  const updateMutation = useUpdateInvoice()
  const deleteMutation = useDeleteInvoice()
  const sendMutation   = useSendInvoiceEmail()

  const [status, setStatus] = useState('')
  const [email, setEmail]   = useState('')

  useEffect(() => {
    if (inv) {
      setStatus(inv.status)
      setEmail(inv.parcel?.sender?.email || '')
    }
  }, [inv])

  // ── Handlers ──────────────────────────────────────────────
  const handleUpdate = async () => {
    if (status === inv.status) {
      return showErrorAlert({
        title: 'Aucun changement',
        text: 'Le statut est identique.',
      })
    }
    try {
      await updateMutation.mutateAsync({ id, data: { status } })
      await refetch()
      showSuccessAlert({
        title: 'Statut mis à jour',
        text: `Nouveau statut : ${STATUS_CONFIG[status]?.label}`,
      })
    } catch (err) {
      console.error(err)
      showErrorAlert({ title: 'Échec', text: 'Impossible de mettre à jour la facture.' })
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
      await sendMutation.mutateAsync({ id, data: { to: email, attach: true } })
      showSuccessAlert({ title: 'Email envoyé', text: `La facture a été envoyée à ${email}.` })
    } catch (err) {
      console.error(err)
      showErrorAlert({ title: 'Erreur envoi', text: "L'email n'a pas pu être envoyé." })
    }
  }

  const handleDelete = async () => {
    const ok = await confirmDeleteAlert({
      message: `Supprimer définitivement la facture ${inv?.number} ?`,
    })
    if (!ok) return
    try {
      await deleteMutation.mutateAsync(id)
      showSuccessAlert({ title: 'Facture supprimée' })
      nav('/invoices')
    } catch (err) {
      console.error(err)
      showErrorAlert({ title: 'Échec suppression' })
    }
  }

  // ── Loading ───────────────────────────────────────────────
  if (isLoading || !inv) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="animate-spin mr-2" size={18} />
        Chargement de la facture...
      </div>
    )
  }

  const pdfUrl =
    inv.pdfPublicUrl ||
    (inv.pdfUrl &&
      (inv.pdfUrl.startsWith('http')
        ? inv.pdfUrl
        : `${import.meta.env.VITE_BASE_API_URL}/api/supabase/public/${inv.pdfUrl}`)) ||
    null

  const isSaving    = updateMutation.isPending
  const isSending   = sendMutation.isPending
  const isDeleting  = deleteMutation.isPending
  const statusDirty = status !== inv.status

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ═════ EN-TÊTE ═════ */}
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
                Facture <span className="font-mono text-violet-600">#{inv.number}</span>
              </h1>
              <StatusBadge status={inv.status} />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Créée le {new Date(inv.createdAt).toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Download uniquement */}
        {pdfUrl && (
          <a
            href={pdfUrl}
            download={`facture-${inv.number}.pdf`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
          >
            <Download size={16} />
            Télécharger
          </a>
        )}
      </div>

      {/* ═════ CONTENU ═════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ─── Colonne gauche : PDF (2/3) ─── */}
        <div className="lg:col-span-2">
          <Card className="p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <FileText size={14} className="text-violet-600" />
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
                  <FileText size={28} className="text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">Aucun PDF disponible</p>
                <p className="text-xs text-slate-400 mt-1">
                  Le PDF n'a pas encore été généré pour cette facture.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* ─── Colonne droite : infos + actions (1/3) ─── */}
        <div className="lg:col-span-1 space-y-6">

            {/* Actions */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">
              Actions
            </h2>

            {/* Statut */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Statut de la facture</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={handleUpdate}
                disabled={isSaving || !statusDirty}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {isSaving ? 'Enregistrement...' : 'Enregistrer le statut'}
              </button>
            </div>

            <hr className="my-5 border-slate-100" />

            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Envoyer par email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@exemple.com"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={isSending || !email}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {isSending ? 'Envoi...' : 'Envoyer la facture'}
              </button>
            </div>

            <hr className="my-5 border-slate-100" />

            {/* Suppression */}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 border border-red-200 disabled:opacity-50 transition"
            >
              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {isDeleting ? 'Suppression...' : 'Supprimer la facture'}
            </button>
          </Card>

          {/* Résumé */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">
              Résumé
            </h2>

            <div className="p-3 bg-slate-50 rounded-lg mb-3">
              <p className="text-xs text-slate-500 mb-1">Montant total</p>
              <p className="text-2xl font-bold text-slate-800">
                {Number(inv.total).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                <span className="text-sm font-normal text-slate-500 ml-1">{inv.currency}</span>
              </p>
            </div>

            <div>
              <InfoRow label="Colis"         value={inv.parcel?.qrcode} mono />
              <InfoRow label="Créée le"      value={new Date(inv.createdAt).toLocaleDateString('fr-FR')} />
              <InfoRow label="Sous-total HT" value={`${Number(inv.subtotal).toFixed(2)} ${inv.currency}`} />
              <InfoRow label="TVA"           value={`${Number(inv.taxRate).toFixed(2)} %`} />
            </div>
          </Card>

          {/* Destinataire */}
          {inv.parcel?.sender && (
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">
                Destinataire
              </h2>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-800">{inv.parcel.sender.name}</p>
                <p className="text-xs text-slate-500">{inv.parcel.sender.email}</p>
                {inv.parcel.sender.phone && (
                  <p className="text-xs text-slate-500">{inv.parcel.sender.phone}</p>
                )}
              </div>
            </Card>
          )}

          
        </div>
      </div>
    </div>
  )
}