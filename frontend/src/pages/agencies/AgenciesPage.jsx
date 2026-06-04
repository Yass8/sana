// src/pages/agencies/AgenciesPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgencies } from '../../hooks/useAgencies'
import { agenciesApi } from '../../api/agencies.api'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import Skeleton from '../../components/ui/Skeleton'
import { confirmDeleteAlert, showSuccessAlert, showErrorAlert } from '../../components/ui/SweetsAlert'
import { Plus, Edit, Trash2, MapPin, Phone, Mail } from 'lucide-react'

const AVATAR_COLORS = ['#7C3AED', '#059669', '#2563EB', '#D97706', '#DC2625', '#0891B2']
const avatarColor = (id) => AVATAR_COLORS[id?.charCodeAt(0) % AVATAR_COLORS.length] ?? '#7C3AED'
const initials = (name) => name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() ?? '?'

export default function AgenciesPage() {
  const navigate = useNavigate()
  const { data: agencies = [], isLoading, refetch } = useAgencies()

  const [showModal, setShowModal] = useState(false)
  const [editAgency, setEditAgency] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: '',
    country: 'FR',
    city: '',
    address: '',
    phone: '',
    email: '',
  })

  const resetForm = () => {
    setForm({ name: '', country: 'FR', city: '', address: '', phone: '', email: '' })
    setEditAgency(null)
  }

  const openAdd = () => {
    resetForm()
    setShowModal(true)
  }

  const openEdit = (agency) => {
    setEditAgency(agency)
    setForm({
      name: agency.name ?? '',
      country: agency.country ?? 'FR',
      city: agency.city ?? '',
      address: agency.address ?? '',
      phone: agency.phone ?? '',
      email: agency.email ?? '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    resetForm()
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (editAgency) {
        await agenciesApi.update(editAgency.id, form)
        await showSuccessAlert({ text: 'Agence mise à jour.' })
      } else {
        await agenciesApi.create(form)
        await showSuccessAlert({ text: 'Agence créée.' })
      }
      closeModal()
      refetch()
    } catch (err) {
      await showErrorAlert({ text: err?.message || 'Une erreur est survenue.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (agency) => {
    const confirmed = await confirmDeleteAlert({
      message: `Supprimer l'agence ${agency.name} (${agency.city}) ? Cette action est irréversible.`,
    })
    if (!confirmed) return
    try {
      await agenciesApi.delete(agency.id)
      await showSuccessAlert({ text: 'Agence supprimée.' })
      refetch()
    } catch (err) {
      await showErrorAlert({ text: err?.message || 'Impossible de supprimer cette agence.' })
    }
  }


  const AgencyCard = ({ agency }) => {
    return (
      <div className="px-4 py-3.5 hover:bg-slate-50/50 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                 style={{ background: avatarColor(agency.id), fontFamily: 'var(--font-display)' }}>
              {initials(agency.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">{agency.name}</p>
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                <MapPin size={12} /> <span>{agency.city}</span>
              </div>
              {agency.address && (
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{agency.address}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => openEdit(agency)}
                    className="p-1.5 text-slate-400 hover:text-violet-600 transition-colors">
              <Edit size={14} />
            </button>
            <button onClick={() => handleDelete(agency)}
                    className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
          {agency.phone && (
            <span className="flex items-center gap-1"><Phone size={12} /> {agency.phone}</span>
          )}
          {agency.email && (
            <span className="flex items-center gap-1"><Mail size={12} /> {agency.email}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 animate-fadeIn mb-0 md:mb-35 lg:mb-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)' }}
              className="text-xl md:text-2xl font-bold text-slate-900">
            Agences
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {agencies.length} agence{agencies.length > 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openAdd}
                className="flex items-center gap-2 bg-[#0A1628] hover:bg-slate-800
                           text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all">
          <Plus size={16} />
          Nouvelle agence
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-3 w-3/4" />
              </div>
            </Card>
          ))}
        </div>
      ) : agencies.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-16">Aucune agence.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* France */}
          {agencies.length > 0 && (
            <div>
              <Card className="divide-y divide-slate-100">
                {agencies.map(a => <AgencyCard key={a.id} agency={a} />)}
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start md:items-center
                        justify-center z-50 p-4 animate-fadeIn"
             onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md
                          flex flex-col gap-5 animate-slideUp md:animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 style={{ fontFamily: 'var(--font-display)' }}
                  className="font-bold text-slate-900 text-base">
                {editAgency ? 'Modifier l\'agence' : 'Nouvelle agence'}
              </h2>
              <button onClick={closeModal}
                      className="text-slate-300 hover:text-slate-500 transition-colors text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Nom <span className="text-violet-600">*</span>
                </label>
                <input name="name" value={form.name} onChange={handleChange} required
                       className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Pays <span className="text-violet-600">*</span>
                  </label>
                  <input type='text' name='country' value={form.country} onChange={handleChange} required
                         className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Ville <span className="text-violet-600">*</span>
                  </label>
                  <input type='text' name="city" value={form.city} onChange={handleChange} required
                         className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Adresse
                </label>
                <input type='text' name="address" value={form.address} onChange={handleChange} rows={2}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none resize-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Téléphone
                  </label>
                  <input name="phone" type="tel" value={form.phone} onChange={handleChange}
                         className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Email
                  </label>
                  <input name="email" type="email" value={form.email} onChange={handleChange}
                         className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                        className="flex-1 border-2 border-slate-200 text-slate-500 py-3 rounded-xl text-sm font-semibold hover:border-slate-300 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={isSubmitting}
                        className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                  {isSubmitting ? <><Spinner size="sm" color="white" /> Enregistrement…</> : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}