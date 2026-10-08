import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Receipt, Package, Plus, Trash2, Loader2,
  Search, User, MapPin, Phone, Scale, Tag, Truck,
  AlertCircle, CheckCircle2, FileText, Users, UserCheck,
  Wallet, SplitSquareHorizontal, CircleDot,
} from 'lucide-react'
import Card from '../../components/ui/Card'
import { useAvailableParcelsForInvoice, useCreateInvoice } from '../../hooks/useInvoices'
import {
  showSuccessAlert,
  showErrorAlert,
} from '../../components/ui/SweetsAlert'

const CURRENCIES = ['EUR', 'USD', 'XOF', 'MAD', 'KMF']

// ────────────────────────────────────────────────────────────
// Item par défaut
// ────────────────────────────────────────────────────────────
const DEFAULT_ITEM = {
  description: 'COLIS EXPRESS',
  subDescription: 'Envoi Express de colis au départ de CDG à destination de MORONI.',
  quantite: 1,
  unite: 'kg',
  prixUnitaire: 17,
  tva: 0,
}

// ────────────────────────────────────────────────────────────
// Modes de paiement
// ────────────────────────────────────────────────────────────
const PAYMENT_MODES = [
  {
    value: 'sender_full',
    label: 'Expéditeur paie tout',
    description: "Règle la totalité au dépôt.",
    icon: UserCheck,
    accent: 'violet',
  },
  {
    value: 'recipient_full',
    label: 'Destinataire paie',
    description: 'Règle au retrait du colis.',
    icon: User,
    accent: 'emerald',
  },
  {
    value: 'split',
    label: 'Partagé',
    description: 'Chacun paie une part.',
    icon: Users,
    accent: 'amber',
  },
]

const fmt = (n) =>
  Number(n || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

// ────────────────────────────────────────────────────────────
// InfoChip
// ────────────────────────────────────────────────────────────
function InfoChip({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-lg">
      <div className="mt-0.5 text-violet-500">
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-xs text-slate-800 font-medium truncate">{value ?? '—'}</p>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Carte mode de paiement
// ────────────────────────────────────────────────────────────
function PaymentModeCard({ mode, selected, onSelect }) {
  const Icon = mode.icon
  const accents = {
    violet:  { bg: 'bg-violet-50',  text: 'text-violet-600',  ring: 'ring-violet-500',  border: 'border-violet-300' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-500', border: 'border-emerald-300' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   ring: 'ring-amber-500',   border: 'border-amber-300' },
  }[mode.accent]

  return (
    <button
      type="button"
      onClick={() => onSelect(mode.value)}
      className={`relative text-left p-4 rounded-xl border-2 transition-all duration-150 ${
        selected
          ? `${accents.border} bg-white shadow-sm ring-2 ${accents.ring} ring-offset-1`
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/40'
      }`}
    >
      {selected && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 size={16} className={accents.text} />
        </div>
      )}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${accents.bg} ${accents.text}`}>
        <Icon size={16} />
      </div>
      <p className="text-sm font-semibold text-slate-800">{mode.label}</p>
      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{mode.description}</p>
    </button>
  )
}

// ────────────────────────────────────────────────────────────
// Barre de progression paiement
// ────────────────────────────────────────────────────────────
function PaymentProgress({ paid, due, currency }) {
  const pct = due > 0 ? Math.min(100, (paid / due) * 100) : 0
  const isFull = pct >= 100 && due > 0
  const color = isFull ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-slate-200'

  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1.5">
        <span className="text-slate-500">Payé</span>
        <span className={`font-semibold ${isFull ? 'text-emerald-600' : 'text-slate-700'}`}>
          {fmt(paid)} / {fmt(due)} {currency}
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Ligne article
// ────────────────────────────────────────────────────────────
function ItemRow({ item, index, onChange, onRemove, canRemove }) {
  const update = (field, value) => onChange(index, { ...item, [field]: value })
  const lineTotal = (Number(item.quantite) || 0) * (Number(item.prixUnitaire) || 0)

  return (
    <div className="grid grid-cols-12 gap-2 items-start p-3 bg-slate-50/60 rounded-lg border border-slate-100">
      <div className="col-span-12 md:col-span-4">
        <label className="text-[10px] text-slate-500 uppercase tracking-wide">Description</label>
        <input
          type="text"
          value={item.description}
          onChange={e => update('description', e.target.value)}
          className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none bg-white"
        />
        <input
          type="text"
          value={item.subDescription}
          onChange={e => update('subDescription', e.target.value)}
          className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-[11px] text-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none bg-white"
        />
      </div>

      <div className="col-span-4 md:col-span-2">
        <label className="text-[10px] text-slate-500 uppercase tracking-wide">Quantité</label>
        <input
          type="number" step="0.01" min="0"
          value={item.quantite}
          onChange={e => update('quantite', e.target.value)}
          className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs text-right focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none bg-white"
        />
      </div>

      <div className="col-span-4 md:col-span-1">
        <label className="text-[10px] text-slate-500 uppercase tracking-wide">Unité</label>
        <input
          type="text"
          value={item.unite}
          onChange={e => update('unite', e.target.value)}
          className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs text-center focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none bg-white"
        />
      </div>

      <div className="col-span-4 md:col-span-2">
        <label className="text-[10px] text-slate-500 uppercase tracking-wide">Prix unitaire</label>
        <input
          type="number" step="0.01" min="0"
          value={item.prixUnitaire}
          onChange={e => update('prixUnitaire', e.target.value)}
          className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs text-right focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none bg-white"
        />
      </div>

      <div className="col-span-4 md:col-span-1">
        <label className="text-[10px] text-slate-500 uppercase tracking-wide">TVA %</label>
        <input
          type="number" step="0.01" min="0"
          value={item.tva}
          onChange={e => update('tva', e.target.value)}
          className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs text-right focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none bg-white"
        />
      </div>

      <div className="col-span-12 md:col-span-2 flex items-end gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-wide">Total HT</label>
          <div className="mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-right font-semibold text-slate-800">
            {fmt(lineTotal)}
          </div>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-1.5 mb-0.5 rounded-md text-red-500 hover:bg-red-50 transition"
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────
export default function NewInvoicePage() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const preselectedParcelId = params.get('parcelId') || ''

  const { data: allParcels = [], isLoading: loadingParcels } =
    useAvailableParcelsForInvoice({ limit: 200 })

  const availableParcels = useMemo(
    () => allParcels.filter(p => !p.invoice),
    [allParcels]
  )

  // ── States ─────────────────────────────────────────────
  const [parcelId, setParcelId] = useState(preselectedParcelId)
  const [search, setSearch]     = useState('')
  const [items, setItems]       = useState([{ ...DEFAULT_ITEM }])
  const [taxRate, setTaxRate]   = useState(0)
  const [currency, setCurrency] = useState('EUR')
  const [notes, setNotes]       = useState('')

  // Répartition
  const [paymentMode, setPaymentMode]       = useState('recipient_full')
  const [senderShareInput, setSenderShareInput] = useState(0)
  const [senderPaid, setSenderPaid]         = useState(0)
  const [recipientPaid, setRecipientPaid]   = useState(0)

  const createMutation = useCreateInvoice()

  const selectedParcel = useMemo(
    () => allParcels.find(p => p.id === parcelId),
    [allParcels, parcelId]
  )

  // Pré-remplir la quantité avec le poids du colis
  useEffect(() => {
    if (!selectedParcel) return
    const weight = Number(selectedParcel.weight)
    if (!weight) return
    setItems(prev => prev.map((it, i) => (i === 0 ? { ...it, quantite: weight } : it)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParcel?.id])

  // Reset les paiements quand on change de mode
  useEffect(() => {
    setSenderPaid(0)
    setRecipientPaid(0)
    if (paymentMode !== 'split') setSenderShareInput(0)
  }, [paymentMode])

  const filteredParcels = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return availableParcels
    return availableParcels.filter(p =>
      (p.qrcode || '').toLowerCase().includes(q) ||
      (p.recipientName || '').toLowerCase().includes(q) ||
      (p.sender?.name || '').toLowerCase().includes(q)
    )
  }, [availableParcels, search])

  // ── Calculs ────────────────────────────────────────────
  const subtotal = useMemo(
    () => items.reduce((s, it) => s + (Number(it.quantite) || 0) * (Number(it.prixUnitaire) || 0), 0),
    [items]
  )
  const totalTVA = useMemo(
    () => items.reduce((s, it) => {
      const ht = (Number(it.quantite) || 0) * (Number(it.prixUnitaire) || 0)
      return s + ht * ((Number(it.tva) || 0) / 100)
    }, 0),
    [items]
  )
  const totalTTC = subtotal + totalTVA

  // Répartition (miroir du back)
  const shares = useMemo(() => {
    const t = totalTTC
    switch (paymentMode) {
      case 'sender_full':    return { senderShare: t, recipientShare: 0 }
      case 'recipient_full': return { senderShare: 0, recipientShare: t }
      case 'split': {
        const s = Math.max(0, Math.min(Number(senderShareInput) || 0, t))
        return { senderShare: s, recipientShare: t - s }
      }
      default: return { senderShare: 0, recipientShare: t }
    }
  }, [paymentMode, senderShareInput, totalTTC])

  const montantPaye = (Number(senderPaid) || 0) + (Number(recipientPaid) || 0)
  const resteAPayer = totalTTC - montantPaye

  // Statut prévisionnel
  const previewStatus = useMemo(() => {
    if (totalTTC <= 0) return { label: 'Brouillon', color: 'bg-slate-100 text-slate-700' }
    if (montantPaye >= totalTTC) return { label: 'Payé', color: 'bg-emerald-100 text-emerald-700' }
    if (montantPaye > 0) return { label: 'Partiel', color: 'bg-amber-100 text-amber-700' }
    return { label: 'En attente', color: 'bg-red-100 text-red-700' }
  }, [totalTTC, montantPaye])

  // ── Handlers articles ─────────────────────────────────
  const handleItemChange = (index, newItem) =>
    setItems(prev => prev.map((it, i) => (i === index ? newItem : it)))

  const handleAddItem = () =>
    setItems(prev => [
      ...prev,
      { ...DEFAULT_ITEM, quantite: Number(selectedParcel?.weight) || DEFAULT_ITEM.quantite },
    ])

  const handleRemoveItem = (index) =>
    setItems(prev => prev.filter((_, i) => i !== index))

  // ── Validation ─────────────────────────────────────────
  const validation = useMemo(() => {
    const errors = {}
    if (!parcelId) errors.parcelId = 'Sélectionnez un colis.'
    if (!items.length) errors.items = 'Au moins un article est requis.'
    const invalidItem = items.find(it =>
      !it.description?.trim() || Number(it.quantite) <= 0 || Number(it.prixUnitaire) < 0
    )
    if (invalidItem) errors.items = 'Vérifiez les descriptions, quantités et prix.'
    if (Number(senderPaid) > shares.senderShare + 0.001)
      errors.senderPaid = "L'acompte expéditeur dépasse sa part."
    if (Number(recipientPaid) > shares.recipientShare + 0.001)
      errors.recipientPaid = "L'acompte destinataire dépasse sa part."
    return { errors, isValid: Object.keys(errors).length === 0 }
  }, [parcelId, items, senderPaid, recipientPaid, shares])

  // ── Submit ─────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validation.isValid) {
      return showErrorAlert({
        title: 'Formulaire incomplet',
        text: Object.values(validation.errors)[0],
      })
    }

    try {
      const payload = {
        parcelId,
        items: items.map(it => ({
          description:    it.description.trim(),
          subDescription: it.subDescription?.trim() || undefined,
          quantite:       Number(it.quantite),
          unite:          it.unite || 'unité',
          prixUnitaire:   Number(it.prixUnitaire),
          tva:            Number(it.tva) || 0,
        })),
        taxRate: Number(taxRate) || 0,
        currency,
        notes: notes?.trim() || undefined,
        // Répartition
        paymentMode,
        senderShare:   Number(senderShareInput) || 0,
        senderPaid:    Number(senderPaid) || 0,
        recipientPaid: Number(recipientPaid) || 0,
      }

      const invoice = await createMutation.mutateAsync(payload)

      await showSuccessAlert({
        title: 'Facture créée',
        text: `La facture #${invoice.number} a été générée avec succès.`,
      })
      nav(`/invoices/${invoice.id}`)
    } catch (err) {
      console.error(err)
      const msg = err?.response?.data?.message || err?.message || 'Impossible de créer la facture.'
      showErrorAlert({ title: 'Échec', text: msg })
    }
  }

  const isSubmitting = createMutation.isPending

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ═════ HEADER ═════ */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => nav('/invoices')}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition"
          title="Retour"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center">
            <Receipt size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Nouvelle facture</h1>
            <p className="text-sm text-slate-500">
              Remplissez les informations pour générer la facture
            </p>
          </div>
        </div>
      </div>

      {/* ═════ 1. SÉLECTION DU COLIS ═════ */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">1</div>
          <h2 className="text-sm font-semibold text-slate-800">Sélection du colis</h2>
        </div>

        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un colis par n° QR, destinataire ou expéditeur…"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
          />
        </div>

        <select
          value={parcelId}
          onChange={e => setParcelId(e.target.value)}
          disabled={loadingParcels}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
        >
          <option value="">
            {loadingParcels
              ? 'Chargement…'
              : `Sélectionner un colis (${filteredParcels.length} disponible${filteredParcels.length > 1 ? 's' : ''})`}
          </option>
          {filteredParcels.map(p => (
            <option key={p.id} value={p.id}>
              {p.qrcode} · {p.recipientName}{p.sender?.name ? ` · de ${p.sender.name}` : ''}
            </option>
          ))}
        </select>

        {!loadingParcels && filteredParcels.length === 0 && (
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
            <AlertCircle size={14} />
            Aucun colis sans facture disponible.
          </p>
        )}
      </Card>

      {/* ═════ 2. APERÇU DU COLIS ═════ */}
      {selectedParcel && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">2</div>
              <h2 className="text-sm font-semibold text-slate-800">Informations du colis</h2>
            </div>
            <span className="font-mono text-xs font-semibold text-violet-700 px-2 py-1 bg-violet-50 rounded-md">
              {selectedParcel.qrcode}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <InfoChip icon={User}    label="Expéditeur"   value={selectedParcel.sender?.name} />
            <InfoChip icon={User}    label="Destinataire" value={selectedParcel.recipientName} />
            <InfoChip icon={Phone}   label="Téléphone"    value={selectedParcel.recipientPhone} />
            <InfoChip icon={MapPin}  label="Adresse"      value={selectedParcel.recipientAddress} />
            <InfoChip icon={Scale}   label="Poids"        value={selectedParcel.weight ? `${selectedParcel.weight} kg` : null} />
            <InfoChip icon={Truck}   label="Service"      value={selectedParcel.service} />
            <InfoChip icon={Tag}     label="Type"         value={selectedParcel.type} />
            <InfoChip icon={Package} label="Description"  value={selectedParcel.description} />
          </div>
        </Card>
      )}

      {/* ═════ 3. ARTICLES ═════ */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">3</div>
            <h2 className="text-sm font-semibold text-slate-800">Articles facturés</h2>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition"
          >
            <Plus size={14} />
            Ajouter un article
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <ItemRow
              key={i}
              item={item}
              index={i}
              onChange={handleItemChange}
              onRemove={handleRemoveItem}
              canRemove={items.length > 1}
            />
          ))}
        </div>
      </Card>

      {/* ═════ 4. RÉPARTITION DU PAIEMENT ═════ */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">4</div>
          <h2 className="text-sm font-semibold text-slate-800">Répartition du paiement</h2>
          <span className="ml-auto text-[11px] text-slate-400 flex items-center gap-1">
            <CircleDot size={10} /> Qui doit payer cette facture ?
          </span>
        </div>

        {/* Cartes modes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PAYMENT_MODES.map(mode => (
            <PaymentModeCard
              key={mode.value}
              mode={mode}
              selected={paymentMode === mode.value}
              onSelect={setPaymentMode}
            />
          ))}
        </div>

        {/* Détail selon le mode */}
        <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">

          {/* Split : part expéditeur */}
          {paymentMode === 'split' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50/60 rounded-xl">
              <div>
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <SplitSquareHorizontal size={12} className="text-violet-500" />
                  Part expéditeur ({currency})
                </label>
                <input
                  type="number" step="0.01" min="0" max={totalTTC}
                  value={senderShareInput}
                  onChange={e => setSenderShareInput(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
                />
                <div className="flex gap-1.5 mt-2">
                  {[25, 50, 75].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSenderShareInput((totalTTC * p / 100).toFixed(2))}
                      className="text-[10px] px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600 transition"
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Part destinataire (auto)</label>
                <input
                  type="number"
                  readOnly
                  value={shares.recipientShare.toFixed(2)}
                  className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>
          )}

          {/* Aperçu répartition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expéditeur */}
            <div className={`p-4 rounded-xl border ${shares.senderShare > 0 ? 'border-violet-100 bg-violet-50/40' : 'border-slate-100 bg-slate-50/40 opacity-60'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                  <UserCheck size={13} />
                </div>
                <span className="text-xs font-semibold text-slate-700">Expéditeur</span>
              </div>

              <p className="text-[11px] text-slate-500 mb-1">Part due</p>
              <p className="text-lg font-bold text-slate-800 mb-3">
                {fmt(shares.senderShare)}
                <span className="text-xs font-normal text-slate-400 ml-1">{currency}</span>
              </p>

              <PaymentProgress
                paid={Number(senderPaid) || 0}
                due={shares.senderShare}
                currency={currency}
              />

              <div className="mt-3">
                <label className="text-[11px] font-medium text-slate-600">Acompte versé</label>
                <input
                  type="number" step="0.01" min="0"
                  max={shares.senderShare}
                  value={senderPaid}
                  onChange={e => setSenderPaid(e.target.value)}
                  disabled={shares.senderShare === 0}
                  className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Destinataire */}
            <div className={`p-4 rounded-xl border ${shares.recipientShare > 0 ? 'border-emerald-100 bg-emerald-50/40' : 'border-slate-100 bg-slate-50/40 opacity-60'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <User size={13} />
                </div>
                <span className="text-xs font-semibold text-slate-700">Destinataire</span>
              </div>

              <p className="text-[11px] text-slate-500 mb-1">Part due</p>
              <p className="text-lg font-bold text-slate-800 mb-3">
                {fmt(shares.recipientShare)}
                <span className="text-xs font-normal text-slate-400 ml-1">{currency}</span>
              </p>

              <PaymentProgress
                paid={Number(recipientPaid) || 0}
                due={shares.recipientShare}
                currency={currency}
              />

              <div className="mt-3">
                <label className="text-[11px] font-medium text-slate-600">Acompte versé</label>
                <input
                  type="number" step="0.01" min="0"
                  max={shares.recipientShare}
                  value={recipientPaid}
                  onChange={e => setRecipientPaid(e.target.value)}
                  disabled={shares.recipientShare === 0}
                  className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ═════ 5. PARAMÈTRES & TOTAUX ═════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">5</div>
            <h2 className="text-sm font-semibold text-slate-800">Paramètres</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">Devise</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Taux TVA global (%)</label>
              <input
                type="number" step="0.01" min="0"
                value={taxRate}
                onChange={e => setTaxRate(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <FileText size={12} />
              Notes (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Informations complémentaires…"
              className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition resize-none"
            />
          </div>
        </Card>

        {/* Récapitulatif */}
        <Card className="p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800">Récapitulatif</h2>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${previewStatus.color}`}>
              {previewStatus.label}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Sous-total HT</span>
              <span className="font-medium text-slate-800">{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>TVA</span>
              <span className="font-medium text-slate-800">{fmt(totalTVA)}</span>
            </div>

            <div className="border-t border-slate-100 my-2" />

            <div className="flex justify-between items-baseline">
              <span className="text-slate-700 font-medium">Total TTC</span>
              <span className="text-xl font-bold text-slate-900">
                {fmt(totalTTC)}
                <span className="text-xs font-normal text-slate-400 ml-1">{currency}</span>
              </span>
            </div>

            <div className="border-t border-slate-100 my-2" />

            {/* Répartition résumée */}
            <div className="flex justify-between text-slate-500 text-xs">
              <span className="flex items-center gap-1">
                <UserCheck size={11} /> Part expéditeur
              </span>
              <span className="font-medium text-slate-700">{fmt(shares.senderShare)}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-xs">
              <span className="flex items-center gap-1">
                <User size={11} /> Part destinataire
              </span>
              <span className="font-medium text-slate-700">{fmt(shares.recipientShare)}</span>
            </div>

            <div className="border-t border-slate-100 my-2" />

            <div className="flex justify-between text-slate-500 text-xs">
              <span>Déjà encaissé</span>
              <span className="font-medium text-slate-700">{fmt(montantPaye)}</span>
            </div>
            <div className={`flex justify-between text-sm font-semibold ${resteAPayer > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              <span>{resteAPayer > 0 ? 'Reste à payer' : 'Soldé'}</span>
              <span>
                {fmt(Math.max(0, resteAPayer))}
                <span className="text-xs font-normal ml-1">{currency}</span>
              </span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !validation.isValid}
            className="w-full mt-5 inline-flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Génération en cours…
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Créer la facture
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-400 text-center mt-3 leading-snug">
            Le PDF sera généré et envoyé sur le stockage automatiquement.
          </p>
        </Card>
      </div>
    </div>
  )
}