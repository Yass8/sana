// src/pages/parcels/NewParcelInvoicePage.jsx
// ═══════════════════════════════════════════════════════════════
// Page : création combinée colis + facture (Solution A)
// ───────────────────────────────────────────────────────────────
// Un seul formulaire, un seul submit, une seule requête backend.
//
// Règle métier :
//   • Dépôt client ('client') : forfait minimum 1 kg (17 €) même si < 1 kg
//   • Livraison (shein, temu, amazon…) : prix au poids réel, sans minimum
//
// Après création réussie → navigation vers /parcels/:id
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Select from 'react-select'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Trash2,
  User,
  UserCheck,
  Users,
} from 'lucide-react'
import { useCreateParcelWithInvoice } from '../../hooks/useParcels'
import { usersApi } from '../../api/users.api'
import { bagsApi } from '../../api/bags.api'
import {
  showSuccessAlert,
  showErrorAlert,
} from '../../components/ui/SweetsAlert'

// ═══════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════

const CURRENCIES = ['EUR', 'USD', 'XOF', 'MAD', 'KMF']
const DEFAULT_PRICE_PER_KG = 17
const MIN_BILLABLE_KG = 1 // Forfait minimum pour dépôt client
const DRAFT_KEY = 'new-parcel-invoice-draft'

const PARCEL_TYPES = [
  { value: 'client',     label: 'Dépôt par client' },
  { value: 'amazon',     label: 'Amazon' },
  { value: 'shein',      label: 'Shein' },
  { value: 'temu',       label: 'Temu' },
  { value: 'colissimo',  label: 'Colissimo' },
  { value: 'chronopost', label: 'Chronopost' },
  { value: 'dhl',        label: 'DHL' },
  { value: 'ups',        label: 'UPS' },
  { value: 'fedex',      label: 'FedEx' },
  { value: 'autre',      label: 'Autre' },
]

const DEFAULT_ITEM = {
  description: 'COLIS EXPRESS',
  subDescription: 'Envoi Express de colis au départ de CDG à destination de MORONI.',
  quantite: 1,
  unite: 'kg',
  prixUnitaire: DEFAULT_PRICE_PER_KG,
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

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const fmt = (n) =>
  Number(n || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const initials = (name) => {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * Calcule la quantité à facturer en tenant compte du forfait minimum.
 *
 * Règle métier :
 *   • Dépôt client ('client')      → minimum 1 kg (soit 17 €)
 *   • Livraison (shein, temu, …)   → facturé au poids réel (pas de minimum)
 *
 * @param {string|number} weight - Poids du colis en kg
 * @param {string} type - Type de colis (parcel.type)
 * @returns {number} Quantité à mettre sur la ligne facture
 */
const getBillableQuantity = (weight, type) => {
  const w = Number(weight) || 0
  if (w <= 0) return 0
  if (type === 'client' && w < MIN_BILLABLE_KG) return MIN_BILLABLE_KG
  return w
}

// ═══════════════════════════════════════════════════════════════
// PRIMITIVES UI
// ═══════════════════════════════════════════════════════════════

function Section({ step, title, description, action, children, className = '' }) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}
    >
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

function FormInput({ icon: Icon, className = '', invalid, ...props }) {
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
        className={`h-10 w-full rounded-lg border bg-white ${
          Icon ? 'pl-9' : 'pl-3'
        } pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
          invalid
            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
            : 'border-slate-300 focus:border-slate-900 focus:ring-slate-900'
        } ${className}`}
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

function Field({ label, htmlFor, required, error, helper, children }) {
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
      ) : helper ? (
        <p className="mt-1.5 text-xs text-slate-500">{helper}</p>
      ) : null}
    </div>
  )
}

function InfoLine({ icon: Icon, label, value, className = '' }) {
  const isEmpty = !value || value === ''
  return (
    <div className={`flex items-start gap-2.5 ${className}`}>
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-slate-400 ring-1 ring-slate-200">
        <Icon size={12} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p
          className={`mt-0.5 truncate text-sm ${
            isEmpty ? 'italic text-slate-400' : 'font-medium text-slate-800'
          }`}
        >
          {isEmpty ? 'Non renseigné' : value}
        </p>
      </div>
    </div>
  )
}

function ClientInfoCard({ client }) {
  const fullName = client.name || 'Client'
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            {initials(fullName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {fullName}
            </p>
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
              <CheckCircle2 size={11} />
              Client existant
            </p>
          </div>
        </div>

        <Link
          to={`/users/${client.id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          title="Ouvrir la fiche dans un nouvel onglet"
        >
          <ExternalLink size={12} />
          Fiche
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoLine icon={Mail}    label="Email"     value={client.email} />
        <InfoLine icon={Phone}   label="Téléphone" value={client.phone} />
        <InfoLine
          icon={MapPin}
          label="Adresse"
          value={client.adresse}
          className="sm:col-span-2"
        />
      </div>
    </div>
  )
}

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

function PaymentProgress({ paid, due, currency }) {
  const pct = due > 0 ? Math.min(100, (paid / due) * 100) : 0
  const isFull = pct >= 100 && due > 0
  const bar = isFull ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-slate-300'
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">Payé</span>
        <span
          className={`font-medium tabular-nums ${
            isFull ? 'text-emerald-600' : 'text-slate-800'
          }`}
        >
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

function PayerCard({ payerType, share, paid, currency, onPaidChange, disabled }) {
  const isDisabled = disabled || share === 0
  const isFull = !isDisabled && paid >= share - 0.001

  const isSender = payerType === 'sender'
  const Icon = isSender ? UserCheck : User
  const label = isSender ? 'Expéditeur' : 'Destinataire'

  const handleToggleFull = (checked) => {
    onPaidChange(checked ? share : 0)
  }

  return (
    <div
      className={`rounded-xl border p-4 transition ${
        isDisabled
          ? 'border-slate-100 bg-slate-50/60 opacity-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Icon size={13} />
        </div>
        <span className="text-xs font-semibold text-slate-700">{label}</span>
      </div>

      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
        Part due
      </p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
        {fmt(share)}
        <span className="ml-1 text-xs font-normal text-slate-400">
          {currency}
        </span>
      </p>

      <div className="mt-3">
        <PaymentProgress paid={paid} due={share} currency={currency} />
      </div>

      <label
        className={`mt-3 flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition ${
          isDisabled
            ? 'cursor-not-allowed border-slate-200 bg-white'
            : isFull
            ? 'border-emerald-300 bg-emerald-50'
            : 'border-slate-200 bg-white hover:bg-slate-50'
        }`}
      >
        <input
          type="checkbox"
          checked={isFull}
          disabled={isDisabled}
          onChange={(e) => handleToggleFull(e.target.checked)}
          className="h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-700">Payé au complet</p>
          {!isDisabled ? (
            <p className="mt-0.5 text-[10px] tabular-nums text-slate-500">
              {fmt(share)} {currency}
            </p>
          ) : null}
        </div>
      </label>

      {!isFull && !isDisabled ? (
        <div className="mt-3">
          <label className="mb-1.5 block text-[11px] font-medium text-slate-600">
            Acompte versé
          </label>
          <FormInput
            type="number"
            step="0.01"
            min="0"
            max={share}
            value={paid || ''}
            onChange={(e) => onPaidChange(e.target.value)}
            placeholder="0.00"
            className="tabular-nums"
          />
        </div>
      ) : null}
    </div>
  )
}

function ItemRow({ item, index, onChange, onRemove, canRemove }) {
  const update = (field, value) => onChange(index, { ...item, [field]: value })
  const lineTotal =
    (Number(item.quantite) || 0) * (Number(item.prixUnitaire) || 0)

  const fieldCls =
    'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900'

  return (
    <div className="grid grid-cols-12 gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
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

// ═══════════════════════════════════════════════════════════════
// REACT-SELECT STYLES
// ═══════════════════════════════════════════════════════════════

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    borderRadius: 8,
    border: state.isFocused ? '1px solid #0f172a' : '1px solid #cbd5e1',
    boxShadow: state.isFocused ? '0 0 0 1px #0f172a' : 'none',
    '&:hover': { borderColor: state.isFocused ? '#0f172a' : '#94a3b8' },
  }),
  valueContainer: (base) => ({ ...base, padding: '0 12px' }),
  placeholder: (base) => ({ ...base, color: '#94a3b8', fontSize: 14 }),
  input: (base) => ({ ...base, color: '#0f172a', fontSize: 14 }),
  menu: (base) => ({ ...base, borderRadius: 10, overflow: 'hidden', zIndex: 50 }),
  option: (base, state) => ({
    ...base,
    fontSize: 13,
    padding: '8px 12px',
    backgroundColor: state.isFocused ? '#f1f5f9' : '#fff',
    color: '#0f172a',
    cursor: 'pointer',
  }),
}

// ═══════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════

export default function NewParcelInvoicePage() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedBagId = searchParams.get('bagId') || ''

  // ─── Mutation unique ───
  const createCombined = useCreateParcelWithInvoice()

  // ─── Recherche client (autocomplete) ───
  const [clientQuery, setClientQuery] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)

  const { data: clientOptions = [], isLoading: searchingClient } = useQuery({
    queryKey: ['user-name-search', clientQuery],
    queryFn: () => usersApi.searchByName(clientQuery),
    enabled: clientQuery.trim().length >= 2,
    select: (data) => (Array.isArray(data) ? data : data?.rows ?? []),
  })

  // ─── Sacs ouverts ───
  const { data: bags = [] } = useQuery({
    queryKey: ['bags', { status: 'ouvert' }],
    queryFn: () => bagsApi.getAll({ status: 'ouvert' }),
    select: (d) => (Array.isArray(d) ? d : d?.rows ?? []),
  })

  // ─── États du formulaire ───
  const [client, setClient] = useState({
    name: '',
    email: '',
    phone: '',
    adresse: '',
  })

  const [recipient, setRecipient] = useState({
    name: '',
    phone: '',
    address: '',
  })

  const [parcel, setParcel] = useState({
    weight: '',
    bagId: preselectedBagId,
    service: 'standard',
    type: 'client',
    urgent: false,
    fragile: false,
    description: '',
  })

  const [invoice, setInvoice] = useState({
    items: [{ ...DEFAULT_ITEM }],
    taxRate: 0,
    currency: 'EUR',
    paymentMode: 'sender_full',
    senderShareInput: 0,
    senderPaid: 0,
    recipientPaid: 0,
    notes: '',
  })

  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [errors, setErrors] = useState({})

  // Suivi de l'édition manuelle de la quantité (pour ne pas écraser)
  const quantityTouchedRef = useRef(false)

  // ─── Restauration du draft au mount ───
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw)
      if (draft.client)    setClient(draft.client)
      if (draft.recipient) setRecipient(draft.recipient)
      if (draft.parcel)    setParcel((p) => ({ ...p, ...draft.parcel }))
      if (draft.invoice)   setInvoice((i) => ({ ...i, ...draft.invoice }))
    } catch {
      // ignore
    }
  }, [])

  // ─── Auto-save draft ───
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ client, recipient, parcel, invoice })
        )
      } catch {
        // ignore
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [client, recipient, parcel, invoice])

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      // ignore
    }
  }

  // ─── Auto-fill quantité quand poids OU type change ───
  // Le type influence le forfait minimum → on dépend des deux.
  useEffect(() => {
    const w = parseFloat(parcel.weight)
    if (!w || w <= 0) return
    if (quantityTouchedRef.current) return
    const qty = getBillableQuantity(w, parcel.type)
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((it, i) =>
        i === 0 ? { ...it, quantite: qty } : it
      ),
    }))
  }, [parcel.weight, parcel.type])

  // ─── Reset acomptes quand mode paiement change ───
  useEffect(() => {
    setInvoice((prev) => ({
      ...prev,
      senderPaid: 0,
      recipientPaid: 0,
      ...(prev.paymentMode !== 'split' ? { senderShareInput: 0 } : {}),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.paymentMode])

  // ─── Sélection client existant ───
  const handleClientSelect = (option) => {
    setSelectedClient(option)
    if (!option) {
      setClient({ name: '', email: '', phone: '', adresse: '' })
      return
    }
    setClient({
      name:    option.name    || '',
      email:   option.email   || '',
      phone:   option.phone   || '',
      adresse: option.adresse || '',
    })
  }

  // ─── Détection nouveau client ───
  const isNewClient = !selectedClient?.id

  // ─── Calculs facture ───
  const subtotal = useMemo(
    () =>
      invoice.items.reduce(
        (s, it) => s + (Number(it.quantite) || 0) * (Number(it.prixUnitaire) || 0),
        0
      ),
    [invoice.items]
  )

  const totalTVA = useMemo(
    () =>
      invoice.items.reduce((s, it) => {
        const ht = (Number(it.quantite) || 0) * (Number(it.prixUnitaire) || 0)
        return s + ht * ((Number(it.tva) || 0) / 100)
      }, 0),
    [invoice.items]
  )

  const totalTTC = subtotal + totalTVA

  const shares = useMemo(() => {
    const t = totalTTC
    switch (invoice.paymentMode) {
      case 'sender_full':
        return { senderShare: t, recipientShare: 0 }
      case 'recipient_full':
        return { senderShare: 0, recipientShare: t }
      case 'split': {
        const s = Math.max(0, Math.min(Number(invoice.senderShareInput) || 0, t))
        return { senderShare: s, recipientShare: t - s }
      }
      default:
        return { senderShare: 0, recipientShare: t }
    }
  }, [invoice.paymentMode, invoice.senderShareInput, totalTTC])

  const montantPaye =
    (Number(invoice.senderPaid) || 0) + (Number(invoice.recipientPaid) || 0)
  const resteAPayer = totalTTC - montantPaye

  const previewStatus = useMemo(() => {
    if (totalTTC <= 0) return { label: 'Brouillon', dot: 'bg-slate-400' }
    if (montantPaye >= totalTTC) return { label: 'Payée', dot: 'bg-emerald-500' }
    if (montantPaye > 0) return { label: 'Partielle', dot: 'bg-amber-500' }
    return { label: 'En attente', dot: 'bg-rose-500' }
  }, [totalTTC, montantPaye])

  // ─── Handlers items ───
  const handleItemChange = (index, newItem) => {
    if (newItem.quantite !== invoice.items[index]?.quantite) {
      quantityTouchedRef.current = true
    }
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => (i === index ? newItem : it)),
    }))
  }

  const handleAddItem = () =>
    setInvoice((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          ...DEFAULT_ITEM,
          quantite:
            getBillableQuantity(parcel.weight, parcel.type) ||
            DEFAULT_ITEM.quantite,
        },
      ],
    }))

  const handleRemoveItem = (index) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
    quantityTouchedRef.current = false
  }

  // ─── Handlers paiement ───
  const handleSenderPaidChange = (value) => {
    setInvoice((prev) => ({ ...prev, senderPaid: value }))
  }

  const handleRecipientPaidChange = (value) => {
    setInvoice((prev) => ({ ...prev, recipientPaid: value }))
  }

  // ─── Feedback prix live + détection du forfait minimum ───
  const weightNum = parseFloat(parcel.weight)
  const billableQty = getBillableQuantity(weightNum, parcel.type)
  const livePrice = billableQty > 0 ? billableQty * DEFAULT_PRICE_PER_KG : 0
  const isMinApplied =
    parcel.type === 'client' && weightNum > 0 && weightNum < MIN_BILLABLE_KG

  // ─── Validation ───
  const validate = () => {
    const e = {}
    if (isNewClient) {
      if (!client.name.trim())  e['client.name']  = 'Requis'
      if (!client.email.trim()) e['client.email'] = 'Requis'
      else if (!/\S+@\S+\.\S+/.test(client.email))
        e['client.email'] = 'Email invalide'
    }
    if (!recipient.name.trim()) e['recipient.name'] = 'Requis'
    if (!weightNum || weightNum <= 0) e['parcel.weight'] = 'Poids requis (> 0)'
    if (!invoice.items.length) e['invoice.items'] = 'Au moins un article requis'
    const invalidItem = invoice.items.find(
      (it) =>
        !it.description?.trim() ||
        Number(it.quantite) <= 0 ||
        Number(it.prixUnitaire) < 0
    )
    if (invalidItem)
      e['invoice.items'] = 'Vérifiez les descriptions, quantités et prix.'

    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ─── Submit ───
  const handleSubmit = async (e) => {
    e?.preventDefault?.()

    if (!validate()) {
      if (errors['invoice.items']) setInvoiceOpen(true)
      return
    }

    const payload = {
      ...(isNewClient
        ? { senderData: { ...client } }
        : { senderId: selectedClient.id }),

      recipientName:    recipient.name.trim(),
      recipientPhone:   recipient.phone.trim() || null,
      recipientAddress: recipient.address.trim() || null,

      bagId:       parcel.bagId || null,
      description: parcel.description.trim() || null,
      weight:      weightNum,
      service:     parcel.service,
      type:        parcel.type,
      urgent:      parcel.urgent,
      fragile:     parcel.fragile,

      items: invoice.items.map((it) => ({
        description:    it.description.trim(),
        subDescription: it.subDescription?.trim() || undefined,
        quantite:       Number(it.quantite),
        unite:          it.unite || 'unité',
        prixUnitaire:   Number(it.prixUnitaire),
        tva:            Number(it.tva) || 0,
      })),
      taxRate:       Number(invoice.taxRate) || 0,
      currency:      invoice.currency,
      notes:         invoice.notes?.trim() || undefined,
      paymentMode:   invoice.paymentMode,
      senderShare:   Number(invoice.senderShareInput) || 0,
      senderPaid:    Number(invoice.senderPaid) || 0,
      recipientPaid: Number(invoice.recipientPaid) || 0,
    }

    try {
      const result = await createCombined.mutateAsync(payload)

      clearDraft()

      const suffix = result?.newClient
        ? ` Nouveau client créé (${result.newClient.email}).`
        : ''
      await showSuccessAlert({
        title: 'Colis + facture créés',
        text: `Colis ${result.parcel.qrcode} et facture #${result.invoice.number} enregistrés.${suffix}`,
      })

      if (result.warnings?.length) {
        await showErrorAlert({
          title: 'Avertissements',
          text: result.warnings.join(' · '),
        })
      }

      setClient({ name: '', email: '', phone: '', adresse: '' })
      setSelectedClient(null)
      setClientQuery('')
      setRecipient({ name: '', phone: '', address: '' })
      setParcel((p) => ({
        ...p,
        weight: '',
        description: '',
        urgent: false,
        fragile: false,
      }))
      setInvoice({
        items: [{ ...DEFAULT_ITEM }],
        taxRate: 0,
        currency: 'EUR',
        paymentMode: 'sender_full',
        senderShareInput: 0,
        senderPaid: 0,
        recipientPaid: 0,
        notes: '',
      })
      quantityTouchedRef.current = false
      setInvoiceOpen(false)
      setErrors({})

      nav(`/parcels/${result.parcel.id}`)
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Impossible de créer le colis et la facture.'
      showErrorAlert({ title: 'Échec', text: msg })
    }
  }

  const isSubmitting = createCombined.isPending

  // ═══════════════════════════════════════════════════════════════
  // RENDU
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-10">
      {/* En-tête */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-500">
            <button
              type="button"
              onClick={() => nav('/parcels')}
              className="inline-flex items-center gap-1 transition hover:text-slate-800"
            >
              <ArrowLeft size={12} />
              Colis
            </button>
            <span className="text-slate-300">/</span>
            <span className="font-medium text-slate-700">Nouveau</span>
          </nav>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Nouveau colis facturé
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Le colis et sa facture sont créés en une seule fois.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        {/* ─── Colonne principale ─── */}
        <div className="flex flex-col gap-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* ─── 1. Client ─── */}
            <Section
              step="1"
              title="Client expéditeur"
              description="Recherchez un client existant ou créez-en un nouveau."
            >
              <div className="space-y-4 px-5 py-4">
                <Field
                  label="Rechercher un client existant"
                  htmlFor="clientSearch"
                >
                  <Select
                    inputId="clientSearch"
                    isClearable
                    isLoading={searchingClient}
                    options={clientOptions.map((u) => ({
                      value: u.id,
                      label: u.name,
                      ...u,
                    }))}
                    value={
                      selectedClient
                        ? {
                            value: selectedClient.id,
                            label: selectedClient.name,
                            ...selectedClient,
                          }
                        : null
                    }
                    onInputChange={(v) => setClientQuery(v)}
                    onChange={handleClientSelect}
                    placeholder="Tapez le nom ou l'email…"
                    noOptionsMessage={() =>
                      clientQuery.length < 2
                        ? 'Tapez au moins 2 caractères.'
                        : 'Aucun client trouvé — remplissez les champs ci-dessous.'
                    }
                    classNamePrefix="client-select"
                    styles={selectStyles}
                  />
                </Field>

                {!isNewClient && selectedClient ? (
                  <ClientInfoCard client={selectedClient} />
                ) : null}

                {isNewClient ? (
                  <div className="grid grid-cols-1 gap-4 rounded-lg border border-amber-200 bg-amber-50/60 p-3 sm:grid-cols-2">
                    <div className="col-span-full flex items-center gap-2 text-xs text-amber-700">
                      <AlertCircle size={13} />
                      Nouveau client — un compte sera créé automatiquement.
                    </div>
                    <Field
                      label="Nom complet"
                      htmlFor="clientName"
                      required
                      error={errors['client.name']}
                    >
                      <FormInput
                        id="clientName"
                        value={client.name}
                        onChange={(e) =>
                          setClient((c) => ({ ...c, name: e.target.value }))
                        }
                        placeholder="Mamadou Diallo"
                        invalid={!!errors['client.name']}
                      />
                    </Field>
                    <Field
                      label="Email"
                      htmlFor="clientEmail"
                      required
                      error={errors['client.email']}
                    >
                      <FormInput
                        id="clientEmail"
                        type="email"
                        value={client.email}
                        onChange={(e) =>
                          setClient((c) => ({ ...c, email: e.target.value }))
                        }
                        placeholder="email@exemple.com"
                        invalid={!!errors['client.email']}
                      />
                    </Field>
                    <Field label="Téléphone" htmlFor="clientPhone">
                      <FormInput
                        id="clientPhone"
                        type="tel"
                        value={client.phone}
                        onChange={(e) =>
                          setClient((c) => ({ ...c, phone: e.target.value }))
                        }
                        placeholder="+33 6 00 00 00 00"
                      />
                    </Field>
                    <Field label="Adresse" htmlFor="clientAdresse">
                      <FormInput
                        id="clientAdresse"
                        value={client.adresse}
                        onChange={(e) =>
                          setClient((c) => ({ ...c, adresse: e.target.value }))
                        }
                        placeholder="Paris, France"
                      />
                    </Field>
                  </div>
                ) : null}
              </div>
            </Section>

            {/* ─── 2. Destinataire ─── */}
            <Section
              step="2"
              title="Destinataire"
              description="Informations affichées sur l'étiquette et la facture."
            >
              <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
                <Field
                  label="Nom complet"
                  htmlFor="recipientName"
                  required
                  error={errors['recipient.name']}
                >
                  <FormInput
                    id="recipientName"
                    value={recipient.name}
                    onChange={(e) =>
                      setRecipient((r) => ({ ...r, name: e.target.value }))
                    }
                    placeholder="Fatou Diallo"
                    invalid={!!errors['recipient.name']}
                  />
                </Field>
                <Field label="Téléphone" htmlFor="recipientPhone">
                  <FormInput
                    id="recipientPhone"
                    type="tel"
                    value={recipient.phone}
                    onChange={(e) =>
                      setRecipient((r) => ({ ...r, phone: e.target.value }))
                    }
                    placeholder="+221 77 000 00 00"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Adresse" htmlFor="recipientAddress">
                    <FormInput
                      id="recipientAddress"
                      value={recipient.address}
                      onChange={(e) =>
                        setRecipient((r) => ({ ...r, address: e.target.value }))
                      }
                      placeholder="123 Rue de l'Exemple, Dakar"
                    />
                  </Field>
                </div>
              </div>
            </Section>

            {/* ─── 3. Détails colis ─── */}
            <Section
              step="3"
              title="Détails du colis"
              description="Poids, sac, options de transport."
            >
              <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
                <Field
                  label="Poids (kg)"
                  htmlFor="weight"
                  required
                  error={errors['parcel.weight']}
                  helper={
                    isMinApplied
                      ? `Forfait minimum 1 kg appliqué → ${fmt(DEFAULT_PRICE_PER_KG)} €`
                      : livePrice > 0
                      ? `≈ ${fmt(livePrice)} € à ${DEFAULT_PRICE_PER_KG} €/kg`
                      : null
                  }
                >
                  <FormInput
                    id="weight"
                    type="number"
                    step="0.01"
                    min="0"
                    value={parcel.weight}
                    onChange={(e) =>
                      setParcel((p) => ({ ...p, weight: e.target.value }))
                    }
                    placeholder="2.5"
                    invalid={!!errors['parcel.weight']}
                    className="tabular-nums"
                  />
                </Field>

                <Field label="Sac (optionnel)" htmlFor="bagId">
                  <FormSelect
                    id="bagId"
                    value={parcel.bagId}
                    onChange={(e) =>
                      setParcel((p) => ({ ...p, bagId: e.target.value }))
                    }
                  >
                    <option value="">Aucun sac (colis individuel)</option>
                    {bags.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.qrcode}
                        {b.destinationAgency?.city
                          ? ` · ${b.destinationAgency.city}`
                          : ''}
                      </option>
                    ))}
                  </FormSelect>
                </Field>

                <Field label="Service" htmlFor="service">
                  <FormSelect
                    id="service"
                    value={parcel.service}
                    onChange={(e) =>
                      setParcel((p) => ({ ...p, service: e.target.value }))
                    }
                  >
                    <option value="standard">Standard</option>
                    <option value="express" selected>Express</option>
                  </FormSelect>
                </Field>

                <Field label="Type de colis" htmlFor="type">
                  <FormSelect
                    id="type"
                    value={parcel.type}
                    onChange={(e) =>
                      setParcel((p) => ({ ...p, type: e.target.value }))
                    }
                  >
                    {PARCEL_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </FormSelect>
                </Field>

                <div className="sm:col-span-2">
                  <Field
                    label="Contenu déclaré"
                    htmlFor="description"
                    helper="Visible sur l'étiquette et la facture."
                  >
                    <textarea
                      id="description"
                      rows={2}
                      value={parcel.description}
                      onChange={(e) =>
                        setParcel((p) => ({ ...p, description: e.target.value }))
                      }
                      placeholder="Vêtements, chaussures, médicaments…"
                      className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </Field>
                </div>

                <div className="col-span-full flex flex-wrap items-center gap-5 border-t border-slate-100 pt-4">
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={parcel.urgent}
                      onChange={(e) =>
                        setParcel((p) => ({ ...p, urgent: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-slate-300 accent-slate-900 focus:ring-slate-900"
                    />
                    <span className="text-sm text-slate-700">Urgent</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={parcel.fragile}
                      onChange={(e) =>
                        setParcel((p) => ({ ...p, fragile: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-slate-300 accent-slate-900 focus:ring-slate-900"
                    />
                    <span className="text-sm text-slate-700">Fragile</span>
                  </label>
                </div>
              </div>
            </Section>

            {/* ─── 4. Facturation (repliable) ─── */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setInvoiceOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 text-left transition hover:bg-slate-50/60"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
                    4
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Facturation
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {invoice.items[0]?.description || 'Article'} ·{' '}
                      {fmt(invoice.items[0]?.quantite)} ×{' '}
                      {fmt(invoice.items[0]?.prixUnitaire)} € ·{' '}
                      {invoice.paymentMode === 'sender_full'
                        ? 'Expéditeur paie'
                        : invoice.paymentMode === 'recipient_full'
                        ? 'Destinataire paie'
                        : 'Partagé'}{' '}
                      ·{' '}
                      <span className="font-medium tabular-nums text-slate-700">
                        {fmt(totalTTC)} {invoice.currency}
                      </span>
                    </p>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-slate-400 transition-transform ${
                    invoiceOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {invoiceOpen ? (
                <div className="space-y-5 px-5 py-4">
                  {/* Articles */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Articles facturés
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <Plus size={13} />
                        Ajouter
                      </button>
                    </div>
                    <div className="space-y-3">
                      {invoice.items.map((it, i) => (
                        <ItemRow
                          key={i}
                          item={it}
                          index={i}
                          onChange={handleItemChange}
                          onRemove={handleRemoveItem}
                          canRemove={invoice.items.length > 1}
                        />
                      ))}
                    </div>

                    {/* Indicateur forfait minimum */}
                    {isMinApplied && Number(invoice.items[0]?.quantite) >= 1 ? (
                      <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                        <AlertCircle
                          size={13}
                          className="mt-0.5 shrink-0 text-amber-600"
                        />
                        <p className="text-xs text-amber-700">
                          <span className="font-medium">
                            Forfait minimum 1 kg appliqué.
                          </span>{' '}
                          Poids réel :{' '}
                          <span className="tabular-nums">{weightNum} kg</span> —
                          facturé <span className="tabular-nums">1 kg</span> (
                          {fmt(DEFAULT_PRICE_PER_KG)} €).
                        </p>
                      </div>
                    ) : null}

                    {errors['invoice.items'] ? (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-600">
                        <AlertCircle size={12} />
                        {errors['invoice.items']}
                      </p>
                    ) : null}
                  </div>

                  {/* Mode de paiement */}
                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Qui règle cette facture ?
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      {PAYMENT_MODES.map((mode) => (
                        <PaymentModeCard
                          key={mode.value}
                          mode={mode}
                          selected={invoice.paymentMode === mode.value}
                          onSelect={(v) =>
                            setInvoice((prev) => ({ ...prev, paymentMode: v }))
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {/* Split */}
                  {invoice.paymentMode === 'split' ? (
                    <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4 md:grid-cols-2">
                      <Field label={`Part expéditeur (${invoice.currency})`}>
                        <FormInput
                          type="number"
                          step="0.01"
                          min="0"
                          max={totalTTC}
                          value={invoice.senderShareInput}
                          onChange={(e) =>
                            setInvoice((prev) => ({
                              ...prev,
                              senderShareInput: e.target.value,
                            }))
                          }
                          className="tabular-nums"
                        />
                        <div className="mt-2 flex gap-1.5">
                          {[25, 50, 75].map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() =>
                                setInvoice((prev) => ({
                                  ...prev,
                                  senderShareInput: (
                                    (totalTTC * p) /
                                    100
                                  ).toFixed(2),
                                }))
                              }
                              className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                            >
                              {p}%
                            </button>
                          ))}
                        </div>
                      </Field>
                      <Field label="Part destinataire (auto)">
                        <FormInput
                          type="number"
                          readOnly
                          value={shares.recipientShare.toFixed(2)}
                          className="!bg-slate-100 !text-slate-500 tabular-nums"
                        />
                      </Field>
                    </div>
                  ) : null}

                  {/* Paiement des payeurs */}
                  <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
                    <PayerCard
                      payerType="sender"
                      share={shares.senderShare}
                      paid={Number(invoice.senderPaid) || 0}
                      currency={invoice.currency}
                      onPaidChange={handleSenderPaidChange}
                    />
                    <PayerCard
                      payerType="recipient"
                      share={shares.recipientShare}
                      paid={Number(invoice.recipientPaid) || 0}
                      currency={invoice.currency}
                      onPaidChange={handleRecipientPaidChange}
                    />
                  </div>

                  {/* Paramètres facture */}
                  <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
                    <Field label="Devise" htmlFor="currency">
                      <FormSelect
                        id="currency"
                        value={invoice.currency}
                        onChange={(e) =>
                          setInvoice((prev) => ({
                            ...prev,
                            currency: e.target.value,
                          }))
                        }
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </FormSelect>
                    </Field>
                    <Field label="TVA globale (%)" htmlFor="taxRate">
                      <FormInput
                        id="taxRate"
                        type="number"
                        step="0.01"
                        min="0"
                        value={invoice.taxRate}
                        onChange={(e) =>
                          setInvoice((prev) => ({
                            ...prev,
                            taxRate: e.target.value,
                          }))
                        }
                        className="tabular-nums"
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <Field
                        label="Notes internes"
                        htmlFor="invoiceNotes"
                        helper="Visible uniquement dans la fiche facture."
                      >
                        <textarea
                          id="invoiceNotes"
                          rows={2}
                          value={invoice.notes}
                          onChange={(e) =>
                            setInvoice((prev) => ({
                              ...prev,
                              notes: e.target.value,
                            }))
                          }
                          placeholder="Informations complémentaires…"
                          className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            {/* Actions mobile */}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end lg:hidden">
              <button
                type="button"
                onClick={() => nav('/parcels')}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Création…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    Créer le colis + la facture
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ─── Colonne récap (sticky desktop) ─── */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-900">
                Récapitulatif
              </h2>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${previewStatus.dot}`}
                />
                {previewStatus.label}
              </span>
            </header>

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
                    {invoice.currency}
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
                    <span className="ml-1 text-xs font-normal">
                      {invoice.currency}
                    </span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="hidden h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 lg:inline-flex"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Création…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    Créer le colis + la facture
                  </>
                )}
              </button>

              <p className="hidden text-center text-[11px] text-slate-400 lg:block">
                Le QR code du colis et le PDF de la facture sont générés
                automatiquement.
              </p>
            </div>
          </section>

          <p className="mt-3 text-center text-[11px] text-slate-400">
            Brouillon sauvegardé automatiquement.
          </p>
        </aside>
      </div>
    </div>
  )
}