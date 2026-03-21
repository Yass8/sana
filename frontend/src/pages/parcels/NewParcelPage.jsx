// src/pages/parcels/NewParcelPage.jsx
import { useState }        from 'react'
import { useNavigate }     from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parcelsApi }      from '../../api/parcels.api'
import { bagsApi }         from '../../api/bags.api'  // à créer

const EMPTY = {
  senderName:      '',
  senderEmail:     '',
  senderPhone:     '',
  recipientName:   '',
  recipientEmail:  '',
  recipientPhone:  '',
  description:     '',
  weight:          '',
  bagId:           '',
}

export default function NewParcelPage() {
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  // Sacs ouverts disponibles
  const { data: bags = [] } = useQuery({
    queryKey: ['bags', { status: 'open' }],
    queryFn:  () => bagsApi.getAll({ status: 'open' }),
  })

  const createParcel = useMutation({
    mutationFn: (data) => parcelsApi.create(data),
    onSuccess: (newParcel) => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      navigate(`/parcels/${newParcel.id}`)
    },
  })

  const set = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const validate = () => {
    const errs = {}
    if (!form.senderName.trim())    errs.senderName    = 'Requis'
    if (!form.recipientName.trim()) errs.recipientName = 'Requis'
    if (!form.bagId)                errs.bagId         = 'Sélectionner un sac'
    if (form.weight && isNaN(parseFloat(form.weight)))
                                    errs.weight        = 'Nombre invalide'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    createParcel.mutate({
      ...form,
      weight: form.weight ? parseFloat(form.weight) : null,
    })
  }

  const Field = ({ label, name, type = 'text', placeholder, required }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-500
                        uppercase tracking-wide">
        {label}{required && <span className="text-[#E8673C] ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={form[name]}
        onChange={set(name)}
        placeholder={placeholder}
        className={`px-3 py-2.5 border-[1.5px] rounded-lg text-sm
                    outline-none transition-all bg-white
                    ${errors[name]
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-slate-200 focus:border-[#E8673C] focus:ring-[#E8673C]/10'}
                    focus:ring-2`}
      />
      {errors[name] && (
        <p className="text-xs text-red-500">{errors[name]}</p>
      )}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/parcels')}
                className="text-slate-400 hover:text-[#E8673C]
                           transition-colors text-sm">
          ← Retour
        </button>
        <h1 style={{fontFamily:'var(--font-display)'}}
            className="text-xl font-bold text-[#0F1923]">
          Nouveau colis
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Bloc expéditeur */}
        <div className="bg-white border border-slate-100
                        rounded-xl p-6 flex flex-col gap-4">
          <h2 style={{fontFamily:'var(--font-display)'}}
              className="text-sm font-bold text-[#0F1923]">
            Expéditeur
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nom complet"   name="senderName"
                   placeholder="Mamadou Diallo" required />
            <Field label="Email"         name="senderEmail"
                   type="email" placeholder="mamadou@email.com" />
            <Field label="Téléphone"     name="senderPhone"
                   placeholder="+33 6 00 00 00 00" />
          </div>
        </div>

        {/* Bloc destinataire */}
        <div className="bg-white border border-slate-100
                        rounded-xl p-6 flex flex-col gap-4">
          <h2 style={{fontFamily:'var(--font-display)'}}
              className="text-sm font-bold text-[#0F1923]">
            Destinataire
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nom complet"   name="recipientName"
                   placeholder="Fatou Diallo" required />
            <Field label="Email"         name="recipientEmail"
                   type="email" placeholder="fatou@email.com" />
            <Field label="Téléphone"     name="recipientPhone"
                   placeholder="+221 77 000 00 00" />
          </div>
        </div>

        {/* Bloc colis */}
        <div className="bg-white border border-slate-100
                        rounded-xl p-6 flex flex-col gap-4">
          <h2 style={{fontFamily:'var(--font-display)'}}
              className="text-sm font-bold text-[#0F1923]">
            Détails du colis
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Poids (kg)"    name="weight"
                   type="number" placeholder="2.5" />

            {/* Sélection du sac */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500
                                uppercase tracking-wide">
                Sac <span className="text-[#E8673C]">*</span>
              </label>
              <select
                value={form.bagId}
                onChange={set('bagId')}
                className={`px-3 py-2.5 border-[1.5px] rounded-lg text-sm
                            outline-none transition-all bg-white
                            ${errors.bagId
                              ? 'border-red-400'
                              : 'border-slate-200 focus:border-[#E8673C]'}
                            focus:ring-2 focus:ring-[#E8673C]/10`}
              >
                <option value="">— Sélectionner un sac ouvert —</option>
                {bags.map(bag => (
                  <option key={bag.id} value={bag.id}>
                    {bag.barcode} · {bag.shipment?.destinationAgency?.city}
                  </option>
                ))}
              </select>
              {errors.bagId && (
                <p className="text-xs text-red-500">{errors.bagId}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500
                              uppercase tracking-wide">
              Contenu déclaré
            </label>
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder="Vêtements, chaussures, médicaments…"
              rows={2}
              className="px-3 py-2.5 border-[1.5px] border-slate-200
                         rounded-lg text-sm outline-none resize-none
                         focus:border-[#E8673C] focus:ring-2
                         focus:ring-[#E8673C]/10 transition-all"
            />
          </div>
        </div>

        {/* Erreur API */}
        {createParcel.isError && (
          <div className="bg-red-50 border border-red-200 text-red-700
                          text-sm px-4 py-3 rounded-xl">
            {createParcel.error?.message ?? 'Erreur lors de la création.'}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/parcels')}
            className="flex-1 border border-slate-200 text-slate-500
                       py-3 rounded-xl text-sm font-medium
                       hover:border-slate-300 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={createParcel.isPending}
            className="flex-1 bg-[#E8673C] hover:bg-[#D45A30]
                       disabled:opacity-60 text-white font-medium
                       text-sm py-3 rounded-xl transition-colors"
          >
            {createParcel.isPending
              ? 'Création en cours…'
              : 'Créer le colis'}
          </button>
        </div>

      </form>
    </div>
  )
}