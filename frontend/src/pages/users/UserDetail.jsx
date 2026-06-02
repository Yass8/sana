// src/pages/users/UserDetail.jsx
import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useUser, useDeleteUser } from '../../hooks/useUsers'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import { ArrowLeft, Mail, Phone, Building2, Calendar, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { confirmDeleteAlert, showErrorAlert, showSuccessAlert } from '../../components/ui/SweetsAlert'

const ROLE_CONFIG = {
  client:   { label: 'Client',    color: 'text-emerald-700', bg: 'bg-emerald-50' },
  agent_fr: { label: 'Agent FR',  color: 'text-blue-700',    bg: 'bg-blue-50'    },
  agent_af: { label: 'Agent AF',  color: 'text-purple-700',  bg: 'bg-purple-50'  },
  admin:    { label: 'Admin',     color: 'text-amber-700',   bg: 'bg-amber-50'   },
}

export default function UserDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { data: user, isLoading } = useUser(id)
  const deleteUser = useDeleteUser()
  const [deleting, setDeleting] = useState(false)

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (!user) return (
    <div className="text-center py-16">
      <p className="text-slate-500">Utilisateur introuvable.</p>
      <button onClick={() => navigate('/users')} className="mt-4 text-violet-600">Retour à la liste</button>
    </div>
  )

  const roleCfg = ROLE_CONFIG[user.role] || { label: user.role, color: 'text-slate-600', bg: 'bg-slate-100' }

  const handleDelete = async () => {
    const message = `La suppression définitive de l’utilisateur ${user.name} entraînera l’effacement irréversible de l’ensemble de ses données, 
    incluant ses colis, l’historique des suivis et modifications,
    ainsi que toutes les notes et commentaires associés. 
    Cette action peut également impacter la fiabilité des statistiques et rapports existants.
    Confirmez-vous vouloir poursuivre cette opération ?`
    const confirmed = await confirmDeleteAlert({ message, confirmButtonText: 'Supprimer' })
    if (!confirmed) return

    setDeleting(true)
    try {
      await deleteUser.mutateAsync(user.id)
      await showSuccessAlert({ text: `Utilisateur supprimé.` })
      navigate('/users')
    } catch (err) {
      await showErrorAlert({ text: err })
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-0 animate-fadeIn">
      {/* Header avec retour */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/users')}
                className="text-slate-400 hover:text-violet-600 text-sm flex items-center gap-1">
          <ArrowLeft size={16} /> Retour
        </button>
        <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-xl font-bold text-slate-900">
          Détail utilisateur
        </h1>
      </div>

      <Card>
        {/* Section en-tête : avatar, nom, rôle, actions */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0"
                 style={{ background: '#7C3AED', fontFamily: 'var(--font-display)' }}>
              {user.name?.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-slate-900">{user.name}</h2>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleCfg.bg} ${roleCfg.color}`}>
                {roleCfg.label}
              </span>
            </div>
          </div>
        </div>

        {/* Informations détaillées */}
        <div className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
            <div className="flex items-center gap-3 sm:w-1/3">
              <Mail size={18} className="text-slate-400 flex-shrink-0" />
              <p className="text-xs text-slate-400">Email</p>
            </div>
            <div className="sm:flex-1">
              <p className="text-slate-800 break-all">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
            <div className="flex items-center gap-3 sm:w-1/3">
              <Phone size={18} className="text-slate-400 flex-shrink-0" />
              <p className="text-xs text-slate-400">Téléphone</p>
            </div>
            <div className="sm:flex-1">
              <p className="text-slate-800">{user.phone || '—'}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
            <div className="flex items-center gap-3 sm:w-1/3">
              <Building2 size={18} className="text-slate-400 flex-shrink-0" />
              <p className="text-xs text-slate-400">Agence</p>
            </div>
            <div className="sm:flex-1">
              <p className="text-slate-800">{user.agency?.name ? `${user.agency.name} (${user.agency.city})` : '—'}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
            <div className="flex items-center gap-3 sm:w-1/3">
              <Calendar size={18} className="text-slate-400 flex-shrink-0" />
              <p className="text-xs text-slate-400">Inscrit le</p>
            </div>
            <div className="sm:flex-1">
              <p className="text-slate-800">
                {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
            <div className="flex items-center gap-3 sm:w-1/3">
              {user.isActive ? <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" /> : <XCircle size={18} className="text-red-500 flex-shrink-0" />}
              <p className="text-xs text-slate-400">Statut</p>
            </div>
            <div className="sm:flex-1">
              <p className="text-slate-800">{user.isActive ? 'Actif' : 'Inactif'}</p>
            </div>
          </div>

          <div className="flex gap-2 md:justify-end mt-10">
            <Link to={`/users/${user.id}/edit`}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1 border-2 border-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-sm font-semibold hover:border-violet-500 hover:text-violet-600">
              <Edit size={14} /> Modifier
            </Link>
            <button onClick={handleDelete} disabled={deleting}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1 border-2 border-red-200 text-red-400 px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-red-50">
              <Trash2 size={14} /> Supprimer définitivement
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}