// src/pages/parcels/NewParcelPage.jsx
import { useState }      from 'react'
import { useNavigate }   from 'react-router-dom'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { parcelsApi }    from '../../api/parcels.api'
import { bagsApi }       from '../../api/bags.api'
import Card              from '../../components/ui/Card'
import Spinner           from '../../components/ui/Spinner'

const EMPTY = {
  senderName: '', senderEmail: '', senderPhone: '',
  recipientName: '', recipientEmail: '', recipientPhone: '',
  description: '', weight: '', bagId: '',
}

export default function NewParcelPage() {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(EMPTY)
  const [errs, setErrs] = useState({})

  const { data: bags = [] } = useQuery({
    queryKey: ['bags', { status: 'open' }],
    queryFn:  () => bagsApi.getAll({ status: 'open' }),
    select:   (d) => Array.isArray(d) ? d : (d?.rows ?? []),
  })

  const create = useMutation({
    mutationFn: (data) => parcelsApi.create(data),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      navigate(`/parcels/${p.id}`)
    },
  })

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.senderName.trim())    e.senderName    = 'Requis'
    if (!form.recipientName.trim()) e.recipientName = 'Requis'
    if (!form.bagId)                e.bagId         = 'Requis'
    if (form.weight && isNaN(parseFloat(form.weight))) e.weight = 'Nombre invalide'
    setErrs(e); return Object.keys(e).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    create.mutate({ ...form, weight: form.weight ? parseFloat(form.weight) : null })
  }

  const Field = ({ label, name, type = 'text', placeholder, required, full }) => (
    <div className={full ? 'col-span-2 md:col-span-2' : ''}>
      <label className="block text-xs font-semibold text-slate-500
                        uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-violet-600 ml-0.5">*</span>}
      </label>
      <input type={type} value={form[name]} onChange={set(name)}
             placeholder={placeholder}
             className={`w-full px-4 py-3 border-2 rounded-xl text-sm outline-none
                         transition-all ${
               errs[name]
                 ? 'border-red-400 focus:ring-4 focus:ring-red-100'
                 : 'border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-100'
             }`}/>
      {errs[name] && <p className="text-xs text-red-500 mt-1">{errs[name]}</p>}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">

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
            <Field label="Nom complet" name="senderName" placeholder="Mamadou Diallo" required/>
            <Field label="Email" name="senderEmail" type="email" placeholder="mamadou@email.com"/>
            <Field label="Téléphone" name="senderPhone" placeholder="+33 6 00 00 00 00"/>
          </div>
        </Card>

        <Card>
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 style={{fontFamily:'var(--font-display)'}}
                className="font-bold text-slate-900">Destinataire</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Nom complet" name="recipientName" placeholder="Fatou Diallo" required/>
            <Field label="Email" name="recipientEmail" type="email" placeholder="fatou@email.com"/>
            <Field label="Téléphone" name="recipientPhone" placeholder="+221 77 000 00 00"/>
          </div>
        </Card>

        <Card>
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 style={{fontFamily:'var(--font-display)'}}
                className="font-bold text-slate-900">Détails du colis</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <Field label="Poids (kg)" name="weight" type="number" placeholder="2.5"/>
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

        {create.isError && (
          <div className="bg-red-50 border border-red-200 text-red-600
                          text-sm px-4 py-3 rounded-xl">
            {create.error?.message ?? 'Erreur lors de la création.'}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/parcels')}
                  className="flex-1 border-2 border-slate-200 text-slate-500
                             py-3.5 rounded-xl text-sm font-semibold
                             hover:border-slate-300 transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={create.isPending}
                  className="flex-1 bg-violet-600 hover:bg-violet-700
                             disabled:opacity-60 text-white font-semibold
                             py-3.5 rounded-xl text-sm transition-colors
                             flex items-center justify-center gap-2">
            {create.isPending ? <><Spinner size="sm" color="white"/> Création…</> : 'Créer le colis'}
          </button>
        </div>
      </form>
    </div>
  )
}