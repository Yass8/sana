// src/pages/parcels/NewParcelPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { parcelsApi } from '../../api/parcels.api'
import { bagsApi } from '../../api/bags.api'
import { usersApi } from '../../api/users.api'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import { UserCheck, AlertCircle } from 'lucide-react'
import { showSuccessAlert, showErrorAlert } from '../../components/ui/SweetsAlert'

const EMPTY = {
  senderName: '', senderEmail: '', senderPhone: '',
  recipientName: '', recipientEmail: '', recipientPhone: '',
  description: '', weight: '', bagId: '',
}

const Field = ({ label, name, type = 'text', placeholder, required, full, value, onChange, error }) => (
  <div className={full ? 'col-span-2 md:col-span-2' : ''}>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
      {label}{required && <span className="text-violet-600 ml-0.5">*</span>}
    </label>
    <input
      type={type}
      value={value}
      name={name}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full px-4 py-3 border-2 rounded-xl text-sm outline-none transition-all ${
        error
          ? 'border-red-400 focus:ring-4 focus:ring-red-100'
          : 'border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-100'
      }`}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
)

export default function NewParcelPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(EMPTY)
  const [errs, setErrs] = useState({})
  const [searchEmail, setSearchEmail] = useState('')
  const [debouncedEmail, setDebouncedEmail] = useState('')
  const [existingClient, setExistingClient] = useState(null)

  // Debounce de l'email
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEmail(searchEmail)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchEmail])

  // Recherche d'un client existant
  const { data: searchResult, isLoading: searchingClient, isError: searchError } = useQuery({
    queryKey: ['user-search', debouncedEmail],
    queryFn: () => usersApi.getAll({ role: 'client', search: debouncedEmail }),
    enabled: debouncedEmail.trim().length > 0,
    select: (data) => {
      const users = Array.isArray(data) ? data : (data?.rows ?? [])
      return users.find(u => u.email.toLowerCase() === debouncedEmail.toLowerCase()) || null
    },
  })

  // Mise à jour du formulaire si client trouvé
  useEffect(() => {
    if (searchResult) {
      setExistingClient(searchResult)
      setForm(prev => ({
        ...prev,
        senderName: searchResult.name,
        senderEmail: searchResult.email,
        senderPhone: searchResult.phone || '',
      }))
    } else if (debouncedEmail && !searchingClient && !searchError) {
      setExistingClient(null)
    }
  }, [searchResult, searchingClient, searchError, debouncedEmail])

  const { data: bags = [] } = useQuery({
    queryKey: ['bags', { status: 'open' }],
    queryFn: () => bagsApi.getAll({ status: 'open' }),
    select: (d) => Array.isArray(d) ? d : (d?.rows ?? []),
  })

  // Mutation de création d'utilisateur
  const createUser = useMutation({
    mutationFn: (data) => usersApi.create(data),
  })

  const createParcel = useMutation({
    mutationFn: (data) => parcelsApi.create(data),
    onSuccess: async (p) => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      await showSuccessAlert({ text: 'Colis ajouté.' })
      navigate(`/parcels/${p.id}`)
    },
  })

  const set = (k) => (e) => {
    let value = e.target.value
    if (k === 'weight' && value !== '') {
      const num = parseFloat(value)
      if (!isNaN(num) && num < 0) value = '0'
    }
    setForm(p => ({ ...p, [k]: value }))
    if (k === 'senderEmail') {
      setSearchEmail(value)
      setExistingClient(null)
    }
  }

  const validate = () => {
    const e = {}
    if (!form.senderName.trim())    e.senderName    = 'Requis'
    if (!form.recipientName.trim()) e.recipientName = 'Requis'
    if (!form.bagId)                e.bagId         = 'Requis'
    if (form.weight !== '') {
      const weightNum = parseFloat(form.weight)
      if (isNaN(weightNum)) e.weight = 'Nombre invalide'
      else if (weightNum < 0) e.weight = 'Le poids ne peut pas être négatif'
    }
    setErrs(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    let senderId = existingClient?.id

    if (!senderId) {
      try {
        const randomPassword = Math.random().toString(36).slice(-8) + 'A1!'
        const response = await createUser.mutateAsync({
          name: form.senderName,
          email: form.senderEmail,
          phone: form.senderPhone || null,
          password: randomPassword,
          role: 'client',
          isActive: true,
        })
        // La réponse peut être directe ou contenir un champ `data`
        senderId = response.id ?? response.data?.id
        console.log('Nouvel utilisateur créé, ID :', senderId)
        await showSuccessAlert({ text: `Nouveau client créé (${form.senderEmail}). Mot de passe temporaire : ${randomPassword}` })
      } catch (err) {
        console.error('Erreur création utilisateur :', err)
        await showErrorAlert({ text: `Erreur lors de la création du client : ${err.message}` })
        return
      }
    }

    const payload = {
      bagId: form.bagId,
      senderId,
      recipientName: form.recipientName,
      recipientEmail: form.recipientEmail || null,
      recipientPhone: form.recipientPhone || null,
      description: form.description || null,
      weight: form.weight ? parseFloat(form.weight) : null,
    }
    console.log('Payload envoyé à l’API :', payload)
    createParcel.mutate(payload)
  }

  const isCreating = createUser.isPending || createParcel.isPending
  const submitDisabled = isCreating || !form.senderEmail || !form.senderName || !form.bagId || !form.recipientName

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn mb-2 md:mb-25 lg:mb-0">

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/parcels')}
                className="text-slate-400 hover:text-violet-600 transition-colors text-sm">
          ← Retour
        </button>
        <h1 style={{fontFamily:'var(--font-display)'}}
            className="text-xl font-bold text-slate-900">Nouveau colis</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        <Card>
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 style={{fontFamily:'var(--font-display)'}}
                className="font-bold text-slate-900">Expéditeur</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <div className="relative">
                <Field
                  label="Email (recherche client existant)"
                  name="senderEmail"
                  type="email"
                  placeholder="email@exemple.com"
                  value={form.senderEmail}
                  onChange={set('senderEmail')}
                  error={errs.senderEmail}
                />
                {(searchingClient || (debouncedEmail && !searchResult && !searchError)) && (
                  <div className="absolute right-3 top-9">
                    <Spinner size="sm" color="text-slate-400" />
                  </div>
                )}
                {existingClient && (
                  <div className="mt-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg p-2 flex items-center gap-2">
                    <UserCheck size={14} />
                    <span>Client existant : {existingClient.name}</span>
                  </div>
                )}
                {debouncedEmail && !searchingClient && !searchResult && !searchError && form.senderEmail && (
                  <div className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg p-2 flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>Aucun client trouvé avec cet email. Un nouveau compte sera créé.</span>
                  </div>
                )}
              </div>
            </div>
            <Field label="Nom complet" name="senderName" placeholder="Mamadou Diallo" required
                   value={form.senderName} onChange={set('senderName')} error={errs.senderName} />
            <Field label="Téléphone" name="senderPhone" placeholder="+33 6 00 00 00 00"
                   value={form.senderPhone} onChange={set('senderPhone')} error={errs.senderPhone} />
          </div>
        </Card>

        <Card>
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 style={{fontFamily:'var(--font-display)'}}
                className="font-bold text-slate-900">Destinataire</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Nom complet" name="recipientName" placeholder="Fatou Diallo" required
                   value={form.recipientName} onChange={set('recipientName')} error={errs.recipientName} />
            <Field label="Email" name="recipientEmail" type="email" placeholder="fatou@email.com"
                   value={form.recipientEmail} onChange={set('recipientEmail')} error={errs.recipientEmail} />
            <Field label="Téléphone" name="recipientPhone" placeholder="+221 77 000 00 00"
                   value={form.recipientPhone} onChange={set('recipientPhone')} error={errs.recipientPhone} />
          </div>
        </Card>

        <Card>
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 style={{fontFamily:'var(--font-display)'}}
                className="font-bold text-slate-900">Détails du colis</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Poids (kg)" name="weight" type="number" placeholder="2.5"
                   value={form.weight} onChange={set('weight')} error={errs.weight} />
            <div>
              <label className="block text-xs font-semibold text-slate-500
                                uppercase tracking-wide mb-1.5">
                Sac <span className="text-violet-600">*</span>
              </label>
              <select value={form.bagId} onChange={set('bagId')}
                      className={`w-full px-4 py-3 border-2 rounded-xl text-sm
                                  outline-none transition-all ${
                        errs.bagId
                          ? 'border-red-400'
                          : 'border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-100'
                      }`}>
                <option value="">— Sélectionner —</option>
                {bags.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.qrcode} · {b.shipment?.destinationAgency?.city}
                  </option>
                ))}
              </select>
              {errs.bagId && <p className="text-xs text-red-500 mt-1">{errs.bagId}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500
                                uppercase tracking-wide mb-1.5">
                Contenu déclaré
              </label>
              <textarea value={form.description} onChange={set('description')}
                        placeholder="Vêtements, chaussures, médicaments…" rows={2}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl
                                   text-sm outline-none resize-none transition-all
                                   focus:border-violet-500 focus:ring-4 focus:ring-violet-100"/>
            </div>
          </div>
        </Card>

        {createParcel.isError && (
          <div className="bg-red-50 border border-red-200 text-red-600
                          text-sm px-4 py-3 rounded-xl">
            {createParcel.error?.message ?? 'Erreur lors de la création.'}
          </div>
        )}

        <div className="flex gap-3 mb-10 md:mb-0 lg:mb-0">
          <button type="button" onClick={() => navigate('/parcels')}
                  className="flex-1 border-2 border-slate-200 text-slate-500
                             py-3.5 rounded-xl text-sm font-semibold
                             hover:border-slate-300 transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={submitDisabled}
                  className="flex-1 bg-violet-600 hover:bg-violet-700
                             disabled:opacity-60 text-white font-semibold
                             py-3.5 rounded-xl text-sm transition-colors
                             flex items-center justify-center gap-2">
            {isCreating ? <><Spinner size="sm" color="white"/> Traitement…</> : 'Créer le colis'}
          </button>
        </div>
      </form>
    </div>
  )
}