// src/pages/invoices/NewInvoicePage.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  MapPin,
  Package,
  Phone,
  Plus,
  Receipt,
  Scale,
  Search,
  Tag,
  Trash2,
  Truck,
  User,
  UserCheck,
  Users,
} from 'lucide-react'
import {
  useAvailableParcelsForInvoice,
  useCreateInvoice,
} from '../../hooks/useInvoices'
import {
  showSuccessAlert,
  showErrorAlert,
} from '../../components/ui/SweetsAlert'

const CURRENCIES = ['EUR', 'USD', 'XOF', 'MAD', 'KMF']

// ────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────
const DEFAULT_ITEM = {
  description: 'COLIS EXPRESS',
  subDescription:
    'Envoi Express de colis au départ de CDG à destination de MORONI.',
  quantite: 1,
  unite: 'kg',
  prixUnitaire: 17,
  tva: 0,
}

const PAYMENT_MODES = [
  {
    value: 'sender_full',
    label: 'Expéditeur',
    description: 'Règle la totalité au dépôt.',
    icon: UserCheck,
  },
  {
    value: 'recipient_full',
    label: 'Destinataire',
    description: 'Règle au retrait du colis.',
    icon: User,
  },
  {
    value: 'split',
    label: 'Partagé',
    description: 'Chacun paie une part.',
    icon: Users,
  },
]

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

// ────────────────────────────────────────────────────────────
// Primitives
// ────────────────────────────────────────────────────────────
function Section({ step, title, description, action, children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
        <div className="flex min-w-0 items-start gap-3">
          {step ? (
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
              {step}
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            ) : null}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

function InfoField({ icon: Icon, label, value }) {
  const isEmpty = value === null || value === undefined || value === ''
  return (
    <div className="flex items-start gap-2.5 border-b border-slate-100 px-4 py-3 last:border-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="mt-0.5 shrink-0 text-slate-400">
        <Icon size={13} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className={`mt-0.5 truncate text-sm ${isEmpty ? 'text-slate-400' : 'font-medium text-slate-800'}`}>
          {isEmpty ? '—' : value}
        </p>
      </div>
    </div>
  )
}

function FormInput({ icon: Icon, className = '', ...props }) {
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
        } pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
      />
    </div>
  )
}

function FormSelect({ children, ...props }) {
  return (
    <div className="relative">
      <select
        {...props}
        className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-8 text-sm text-slate-800 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50"
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
// Payment mode selector — segmented cards
// ────────────────────────────────────────────────────────────
function PaymentModeCard({ mode, selected, onSelect }) {
  const Icon = mode.icon
  return (
    <button
      type="button"
      onClick={() => onSelect(mode.value)}
      className={`relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition ${
        selected
          ? 'border-slate-900 bg-slate-50'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
      }`}
    >
      {selected ? (
        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white">
          <Check size={11} />
        </div>
      ) : null}
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          selected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
        }`}
      >
        <Icon size={15} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{mode.label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{mode.description}</p>
      </div>
    </button>
  )
}

// ────────────────────────────────────────────────────────────
// Payment progress
// ────────────────────────────────────────────────────────────
function PaymentProgress({ paid, due, currency }) {
  const pct = due > 0 ? Math.min(100, (paid / due) * 100) : 0
  const isFull = pct >= 100 && due > 0
  const bar = isFull ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-slate-300'

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">Payé</span>
        <span className={`font-medium tabular-nums ${isFull ? 'text-emerald-600' : 'text-slate-800'}`}>
          {fmt(paid)} / {fmt(due)} {currency}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ${bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Item row
// ────────────────────────────────────────────────────────────
function ItemRow({ item, index, onChange, onRemove, canRemove }) {
  const update = (field, value) => onChange(index, { ...item, [field]: value })
  const lineTotal =
    (Number(item.quantite) || 0) * (Number(item.prixUnitaire) || 0)

  const fieldCls =
    'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900'

  return (
    <div className="grid grid-cols-12 gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      {/* Description */}
      <div className="col-span-12 space-y-1.5 md:col-span-4">
        <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">
          Description
        </label>
        <input
          type="text"
          value={item.description}
          onChange={(e) => update('description', e.target.value)}
          className={fieldCls}
        />
        <input
          type="text"
          value={item.subDescription}
          onChange={(e) => update('subDescription', e.target.value)}
          className={`${fieldCls} text-slate-500`}
        />
      </div>

      {/* Quantité */}
      <div className="col-span-4 md:col-span-2">
        <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">
          Quantité
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={item.quantite}
          onChange={(e) => update('quantite', e.target.value)}
          className={`${fieldCls} mt-1.5 text-right tabular-nums`}
        />
      </div>

      {/* Unité */}
      <div className="col-span-4 md:col-span-1">
        <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">
          Unité
        </label>
        <input
          type="text"
          value={item.unite}
          onChange={(e) => update('unite', e.target.value)}
          className={`${fieldCls} mt-1.5 text-center`}
        />
      </div>

      {/* Prix unitaire */}
      <div className="col-span-4 md:col-span-2">
        <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">
          Prix unit.
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={item.prixUnitaire}
          onChange={(e) => update('prixUnitaire', e.target.value)}
          className={`${fieldCls} mt-1.5 text-right tabular-nums`}
        />
      </div>

      {/* TVA */}
      <div className="col-span-4 md:col-span-1">
        <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">
          TVA %
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={item.tva}
          onChange={(e) => update('tva', e.target.value)}
          className={`${fieldCls} mt-1.5 text-right tabular-nums`}
        />
      </div>

      {/* Total ligne */}
      <div className="col-span-12 flex items-end gap-2 md:col-span-2">
        <div className="flex-1">
          <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">
            Total HT
          </label>
          <div className="mt-1.5 flex h-10 items-center justify-end rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold tabular-nums text-slate-800">
            {fmt(lineTotal)}
          </div>
        </div>
        {canRemove ? (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        ) : null}
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
    () => allParcels.filter((p) => !p.invoice),
    [allParcels]
  )

  // ── States ────────────────────────────────────────────────
  const [parcelId, setParcelId] = useState(preselectedParcelId)
  const [search, setSearch] = useState('')
  const [items, setItems] = useState([{ ...DEFAULT_ITEM }])
  const [taxRate, setTaxRate] = useState(0)
  const [currency, setCurrency] = useState('EUR')
  const [notes, setNotes] = useState('')

  const [paymentMode, setPaymentMode] = useState('recipient_full')
  const [senderShareInput, setSenderShareInput] = useState(0)
  const [senderPaid, setSenderPaid] = useState(0)
  const [recipientPaid, setRecipientPaid] = useState(0)

  const createMutation = useCreateInvoice()

  const selectedParcel = useMemo(
    () => allParcels.find((p) => p.id === parcelId),
    [allParcels, parcelId]
  )

  // Pré-remplir la quantité avec le poids
  useEffect(() => {
    if (!selectedParcel) return
    const weight = Number(selectedParcel.weight)
    if (!weight) return
    setItems((prev) =>
      prev.map((it, i) => (i === 0 ? { ...it, quantite: weight } : it))
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParcel?.id])

  // Reset paiements au changement de mode
  useEffect(() => {
    setSenderPaid(0)
    setRecipientPaid(0)
    if (paymentMode !== 'split') setSenderShareInput(0)
  }, [paymentMode])

  const filteredParcels = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return availableParcels
    return availableParcels.filter(
      (p) =>
        (p.qrcode || '').toLowerCase().includes(q) ||
        (p.recipientName || '').toLowerCase().includes(q) ||
        (p.sender?.name || '').toLowerCase().includes(q)
    )
  }, [availableParcels, search])

  // ── Calculs ───────────────────────────────────────────────
  const subtotal = useMemo(
    () =>
      items.reduce(
        (s, it) =>
          s + (Number(it.quantite) || 0) * (Number(it.prixUnitaire) || 0),
        0
      ),
    [items]
  )
  const totalTVA = useMemo(
    () =>
      items.reduce((s, it) => {
        const ht =
          (Number(it.quantite) || 0) * (Number(it.prixUnitaire) || 0)
        return s + ht * ((Number(it.tva) || 0) / 100)
      }, 0),
    [items]
  )
  const totalTTC = subtotal + totalTVA

  const shares = useMemo(() => {
    const t = totalTTC
    switch (paymentMode) {
      case 'sender_full':
        return { senderShare: t, recipientShare: 0 }
      case 'recipient_full':
        return { senderShare: 0, recipientShare: t }
      case 'split': {
        const s = Math.max(0, Math.min(Number(senderShareInput) || 0, t))
        return { senderShare: s, recipientShare: t - s }
      }
      default:
        return { senderShare: 0, recipientShare: t }
    }
  }, [paymentMode, senderShareInput, totalTTC])

  const montantPaye = (Number(senderPaid) || 0) + (Number(recipientPaid) || 0)
  const resteAPayer = totalTTC - montantPaye

  const previewStatus = useMemo(() => {
    if (totalTTC <= 0)
      return { label: 'Brouillon', dot: 'bg-slate-400' }
    if (montantPaye >= totalTTC)
      return { label: 'Payée', dot: 'bg-emerald-500' }
    if (montantPaye > 0)
      return { label: 'Partielle', dot: 'bg-amber-500' }
    return { label: 'En attente', dot: 'bg-rose-500' }
  }, [totalTTC, montantPaye])

  // ── Handlers articles ────────────────────────────────────
  const handleItemChange = (index, newItem) =>
    setItems((prev) => prev.map((it, i) => (i === index ? newItem : it)))

  const handleAddItem = () =>
    setItems((prev) => [
      ...prev,
      {
        ...DEFAULT_ITEM,
        quantite: Number(selectedParcel?.weight) || DEFAULT_ITEM.quantite,
      },
    ])

  const handleRemoveItem = (index) =>
    setItems((prev) => prev.filter((_, i) => i !== index))

  // ── Validation ────────────────────────────────────────────
  const validation = useMemo(() => {
    const errors = {}
    if (!parcelId) errors.parcelId = 'Sélectionnez un colis.'
    if (!items.length) errors.items = 'Au moins un article est requis.'
    const invalidItem = items.find(
      (it) =>
        !it.description?.trim() ||
        Number(it.quantite) <= 0 ||
        Number(it.prixUnitaire) < 0
    )
    if (invalidItem)
      errors.items = 'Vérifiez les descriptions, quantités et prix.'
    if (Number(senderPaid) > shares.senderShare + 0.001)
      errors.senderPaid = "L'acompte expéditeur dépasse sa part."
    if (Number(recipientPaid) > shares.recipientShare + 0.001)
      errors.recipientPaid = "L'acompte destinataire dépasse sa part."
    return { errors, isValid: Object.keys(errors).length === 0 }
  }, [parcelId, items, senderPaid, recipientPaid, shares])

  // ── Submit ────────────────────────────────────────────────
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
        items: items.map((it) => ({
          description: it.description.trim(),
          subDescription: it.subDescription?.trim() || undefined,
          quantite: Number(it.quantite),
          unite: it.unite || 'unité',
          prixUnitaire: Number(it.prixUnitaire),
          tva: Number(it.tva) || 0,
        })),
        taxRate: Number(taxRate) || 0,
        currency,
        notes: notes?.trim() || undefined,
        paymentMode,
        senderShare: Number(senderShareInput) || 0,
        senderPaid: Number(senderPaid) || 0,
        recipientPaid: Number(recipientPaid) || 0,
      }

      const invoice = await createMutation.mutateAsync(payload)

      await showSuccessAlert({
        title: 'Facture créée',
        text: `La facture #${invoice.number} a été générée avec succès.`,
      })
      nav(`/invoices/${invoice.id}`)
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Impossible de créer la facture.'
      showErrorAlert({ title: 'Échec', text: msg })
    }
  }

  const isSubmitting = createMutation.isPending

  // ── Rendu ─────────────────────────────────────────────────
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-10">
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
            <span className="font-medium text-slate-700">Nouvelle</span>
          </nav>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Nouvelle facture
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sélectionnez un colis, ajoutez les articles et définissez la
            répartition du paiement.
          </p>
        </div>
      </header>

      {/* 1. Sélection colis */}
      <Section
        step="1"
        title="Sélection du colis"
        description={
          loadingParcels
            ? 'Chargement des colis disponibles…'
            : `${filteredParcels.length} colis disponible${
                filteredParcels.length > 1 ? 's' : ''
              } sans facture`
        }
      >
        <div className="space-y-3 px-5 py-4">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par n° QR, destinataire ou expéditeur…"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <FormSelect
            value={parcelId}
            onChange={(e) => setParcelId(e.target.value)}
            disabled={loadingParcels}
          >
            <option value="">
              {loadingParcels
                ? 'Chargement…'
                : `Sélectionner un colis (${filteredParcels.length} disponible${
                    filteredParcels.length > 1 ? 's' : ''
                  })`}
            </option>
            {filteredParcels.map((p) => (
              <option key={p.id} value={p.id}>
                {p.qrcode} · {p.recipientName}
                {p.sender?.name ? ` · de ${p.sender.name}` : ''}
              </option>
            ))}
          </FormSelect>

          {!loadingParcels && filteredParcels.length === 0 && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <AlertCircle size={13} />
              Aucun colis sans facture disponible.
            </p>
          )}
        </div>
      </Section>

      {/* 2. Aperçu colis */}
      {selectedParcel ? (
        <Section
          step="2"
          title="Informations du colis"
          description="Données reprises depuis la fiche colis."
          action={
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-medium text-slate-700">
              {selectedParcel.qrcode}
            </span>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <InfoField icon={User} label="Expéditeur" value={selectedParcel.sender?.name} />
            <InfoField icon={User} label="Destinataire" value={selectedParcel.recipientName} />
            <InfoField icon={Phone} label="Téléphone" value={selectedParcel.recipientPhone} />
            <InfoField icon={MapPin} label="Adresse" value={selectedParcel.recipientAddress} />

            <InfoField
              icon={Scale}
              label="Poids"
              value={selectedParcel.weight ? `${selectedParcel.weight} kg` : null}
            />
            <InfoField icon={Truck} label="Service" value={selectedParcel.service} />
            <InfoField icon={Tag} label="Type" value={selectedParcel.type} />
            <InfoField icon={Package} label="Description" value={selectedParcel.description} />
          </div>
        </Section>
      ) : null}

      {/* 3. Articles */}
      <Section
        step="3"
        title="Articles facturés"
        description="Le total HT de chaque ligne est calculé automatiquement."
        action={
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Plus size={13} />
            Ajouter
          </button>
        }
      >
        <div className="space-y-3 px-5 py-4">
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
      </Section>

      {/* 4. Répartition */}
      <Section
        step="4"
        title="Répartition du paiement"
        description="Qui doit régler cette facture ?"
      >
        <div className="space-y-5 px-5 py-4">
          {/* Modes */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {PAYMENT_MODES.map((mode) => (
              <PaymentModeCard
                key={mode.value}
                mode={mode}
                selected={paymentMode === mode.value}
                onSelect={setPaymentMode}
              />
            ))}
          </div>

          {/* Split : part expéditeur éditable */}
          {paymentMode === 'split' ? (
            <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Part expéditeur ({currency})
                </label>
                <FormInput
                  type="number"
                  step="0.01"
                  min="0"
                  max={totalTTC}
                  value={senderShareInput}
                  onChange={(e) => setSenderShareInput(e.target.value)}
                />
                <div className="mt-2 flex gap-1.5">
                  {[25, 50, 75].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() =>
                        setSenderShareInput(((totalTTC * p) / 100).toFixed(2))
                      }
                      className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Part destinataire (auto)
                </label>
                <FormInput
                  type="number"
                  readOnly
                  value={shares.recipientShare.toFixed(2)}
                  className="!bg-slate-100 !text-slate-500"
                />
              </div>
            </div>
          ) : null}

          {/* Aperçu parts */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Expéditeur */}
            <div
              className={`rounded-xl border p-4 transition ${
                shares.senderShare > 0
                  ? 'border-slate-200 bg-white'
                  : 'border-slate-100 bg-slate-50/60 opacity-50'
              }`}
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <UserCheck size={13} />
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  Expéditeur
                </span>
              </div>

              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Part due
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
                {fmt(shares.senderShare)}
                <span className="ml-1 text-xs font-normal text-slate-400">
                  {currency}
                </span>
              </p>

              <div className="mt-3">
                <PaymentProgress
                  paid={Number(senderPaid) || 0}
                  due={shares.senderShare}
                  currency={currency}
                />
              </div>

              <div className="mt-3">
                <label className="mb-1.5 block text-[11px] font-medium text-slate-600">
                  Acompte versé
                </label>
                <FormInput
                  type="number"
                  step="0.01"
                  min="0"
                  max={shares.senderShare}
                  value={senderPaid}
                  onChange={(e) => setSenderPaid(e.target.value)}
                  disabled={shares.senderShare === 0}
                />
              </div>
            </div>

            {/* Destinataire */}
            <div
              className={`rounded-xl border p-4 transition ${
                shares.recipientShare > 0
                  ? 'border-slate-200 bg-white'
                  : 'border-slate-100 bg-slate-50/60 opacity-50'
              }`}
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <User size={13} />
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  Destinataire
                </span>
              </div>

              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Part due
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
                {fmt(shares.recipientShare)}
                <span className="ml-1 text-xs font-normal text-slate-400">
                  {currency}
                </span>
              </p>

              <div className="mt-3">
                <PaymentProgress
                  paid={Number(recipientPaid) || 0}
                  due={shares.recipientShare}
                  currency={currency}
                />
              </div>

              <div className="mt-3">
                <label className="mb-1.5 block text-[11px] font-medium text-slate-600">
                  Acompte versé
                </label>
                <FormInput
                  type="number"
                  step="0.01"
                  min="0"
                  max={shares.recipientShare}
                  value={recipientPaid}
                  onChange={(e) => setRecipientPaid(e.target.value)}
                  disabled={shares.recipientShare === 0}
                />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 5. Paramètres + récap */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Paramètres */}
        <Section step="5" title="Paramètres">
          <div className="space-y-4 px-5 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Devise
                </label>
                <FormSelect
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </FormSelect>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Taux TVA global (%)
                </label>
                <FormInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <FileText size={12} />
                Notes internes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Informations complémentaires…"
                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>
        </Section>

        {/* Récapitulatif */}
        <Section
          title="Récapitulatif"
          action={
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
              <span className={`h-1.5 w-1.5 rounded-full ${previewStatus.dot}`} />
              {previewStatus.label}
            </span>
          }
          className="self-start lg:sticky lg:top-4"
        >
          <div className="space-y-3 px-5 py-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-slate-500">
                <span>Sous-total HT</span>
                <span className="tabular-nums text-slate-800">
                  {fmt(subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>TVA</span>
                <span className="tabular-nums text-slate-800">
                  {fmt(totalTVA)}
                </span>
              </div>
            </div>

            <div className="flex items-baseline justify-between border-t border-slate-200 pt-3">
              <span className="text-sm font-medium text-slate-700">
                Total TTC
              </span>
              <span className="text-xl font-semibold tabular-nums text-slate-900">
                {fmt(totalTTC)}
                <span className="ml-1 text-xs font-normal text-slate-400">
                  {currency}
                </span>
              </span>
            </div>

            <div className="space-y-1.5 border-t border-slate-200 pt-3 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <UserCheck size={11} />
                  Part expéditeur
                </span>
                <span className="tabular-nums text-slate-700">
                  {fmt(shares.senderShare)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <User size={11} />
                  Part destinataire
                </span>
                <span className="tabular-nums text-slate-700">
                  {fmt(shares.recipientShare)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-slate-200 pt-3 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span>Déjà encaissé</span>
                <span className="tabular-nums text-slate-700">
                  {fmt(montantPaye)}
                </span>
              </div>
              <div
                className={`flex items-center justify-between text-sm font-semibold ${
                  resteAPayer > 0 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                <span>{resteAPayer > 0 ? 'Reste à payer' : 'Soldé'}</span>
                <span className="tabular-nums">
                  {fmt(Math.max(0, resteAPayer))}
                  <span className="ml-1 text-xs font-normal">{currency}</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !validation.isValid}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Génération…
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  Créer la facture
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-slate-400">
              Le PDF sera généré et stocké automatiquement.
            </p>
          </div>
        </Section>
      </div>
    </div>
  )
}