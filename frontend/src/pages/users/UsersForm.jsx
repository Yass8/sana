// src/pages/users/UserForm.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUser, useCreateUser, useUpdateUser } from '../../hooks/useUsers'
import { useAgencies } from '../../hooks/useAgencies'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import { ArrowLeft, Save, User } from 'lucide-react'
import { showSuccessAlert } from '../../components/ui/SweetsAlert'

const ROLES = [
  { value: 'client', label: 'Client' },
  { value: 'agent_fr', label: 'Agent France' },
  { value: 'agent_af', label: 'Agent Afrique' },
  { value: 'admin', label: 'Administrateur' },
]

export default function UserForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const { data: user, isLoading: loadingUser } = useUser(id)
  const { data: agencies = [] } = useAgencies()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()

  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    role: 'client', agencyId: '', isActive: true,
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '',
        role: user.role || 'client',
        agencyId: user.agencyId || '',
        isActive: user.isActive ?? true,
      })
    }
  }, [user])

  const setField = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const setCheckbox = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.checked }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Requis'
    if (!form.email.trim()) e.email = 'Requis'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email invalide'
    if (!isEdit && !form.password.trim()) e.password = 'Requis'
    if (form.password && form.password.length < 6) e.password = 'Minimum 6 caractères'
    if (form.role !== 'client' && !form.agencyId) e.agencyId = 'Requis pour ce rôle'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      role: form.role,
      agencyId: form.agencyId || null,
      isActive: form.isActive,
    }
    if (!isEdit || form.password) payload.password = form.password

    try {
      if (isEdit) {
        await updateUser.mutateAsync({ id, data: payload })
      } else {
        await createUser.mutateAsync(payload)
        await showSuccessAlert({ text: 'Utilisateur ajouté.' })
      }
      navigate('/users')
    } catch (err) {
      setErrors({ submit: err.message })
    }
  }

  if (isEdit && loadingUser) return <div className="flex justify-center py-16"><Spinner /></div>

  const showAgencySelect = form.role !== 'client'

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-0 animate-fadeIn">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/users')}
                className="text-slate-400 hover:text-violet-600 text-sm flex items-center gap-1">
          <ArrowLeft size={16} /> Retour
        </button>
        <h1 style={{ fontFamily: 'var(--font-display)' }}
            className="text-xl font-bold text-slate-900">
          {isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Card>
          <div className="px-4 md:px-5 py-4 border-b border-slate-100">
            <h2 style={{ fontFamily: 'var(--font-display)' }}
                className="font-bold text-slate-900 flex items-center gap-2 text-base md:text-lg">
              <User size={18} /> Informations générales
            </h2>
          </div>
          <div className="p-4 md:p-5 space-y-4">
            {/* Nom complet */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Nom complet <span className="text-violet-600">*</span>
              </label>
              <input type="text" value={form.name} onChange={setField('name')}
                     className={`w-full px-4 py-3 border-2 rounded-xl text-sm outline-none transition-all ${
                       errors.name ? 'border-red-400' : 'border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-100'
                     }`} />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Email + Téléphone en grille responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Email <span className="text-violet-600">*</span>
                </label>
                <input type="email" value={form.email} onChange={setField('email')}
                       className={`w-full px-4 py-3 border-2 rounded-xl text-sm outline-none transition-all ${
                         errors.email ? 'border-red-400' : 'border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-100'
                       }`} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Téléphone
                </label>
                <input type="tel" value={form.phone} onChange={setField('phone')}
                       className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
              </div>
            </div>

            {/* Rôle + Mot de passe */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Rôle
                </label>
                <select value={form.role} onChange={setField('role')}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Mot de passe {!isEdit && <span className="text-violet-600">*</span>}
                  {isEdit && <span className="text-xs text-slate-400 ml-1">(laisser vide pour conserver)</span>}
                </label>
                <input type="password" value={form.password} onChange={setField('password')}
                       className={`w-full px-4 py-3 border-2 rounded-xl text-sm outline-none transition-all ${
                         errors.password ? 'border-red-400' : 'border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-100'
                       }`} />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>
            </div>

            {/* Agence (conditionnel) */}
            {showAgencySelect && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Agence <span className="text-violet-600">*</span>
                </label>
                <select value={form.agencyId} onChange={setField('agencyId')}
                        className={`w-full px-4 py-3 border-2 rounded-xl text-sm outline-none transition-all ${
                          errors.agencyId ? 'border-red-400' : 'border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-100'
                        }`}>
                  <option value="">— Sélectionner —</option>
                  {agencies.map(a => <option key={a.id} value={a.id}>{a.name} ({a.city})</option>)}
                </select>
                {errors.agencyId && <p className="text-xs text-red-500 mt-1">{errors.agencyId}</p>}
              </div>
            )}

            {/* Checkbox compte actif */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={setCheckbox('isActive')}
                       className="accent-violet-600 w-4 h-4" />
                <span className="text-sm text-slate-700">Compte actif</span>
              </label>
            </div>
          </div>
        </Card>

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
            {errors.submit}
          </div>
        )}

        <div className="mb-10 lg:mb-0 md:mb-0 flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={() => navigate('/users')}
                  className="flex-1 border-2 border-slate-200 text-slate-500 py-3.5 rounded-xl text-sm font-semibold hover:border-slate-300">
            Annuler
          </button>
          <button type="submit"
                  disabled={createUser.isPending || updateUser.isPending}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2">
            <Save size={16} />
            {createUser.isPending || updateUser.isPending ? 'Enregistrement…' : (isEdit ? 'Mettre à jour' : 'Créer')}
          </button>
        </div>
      </form>
    </div>
  )
}