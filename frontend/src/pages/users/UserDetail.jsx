import { useNavigate, useParams, Link } from 'react-router-dom'
import { useUser, useDeleteUser } from '../../hooks/useUsers'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import UserAvatar from '../../components/ui/UserAvatar'
import UserStatsCards from '../../components/users/UserStatsCards'
import {
  ArrowLeft, Mail, Phone, Building2, Calendar, Edit, Trash2,
  CheckCircle, XCircle
} from 'lucide-react'
import { confirmDeleteAlert, showErrorAlert, showSuccessAlert } from '../../components/ui/SweetsAlert'
import { useState } from 'react'

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
      <button onClick={() => navigate('/users')} className="mt-4 text-violet-600 font-medium">Retour à la liste</button>
    </div>
  )

  const roleCfg = ROLE_CONFIG[user.role] || { label: user.role, color: 'text-slate-600', bg: 'bg-slate-100' }

  const handleDelete = async () => {
    const message = `Supprimer définitivement ${user.name} ? Toutes ses données (colis, historique, etc.) seront perdues.`
    const confirmed = await confirmDeleteAlert({ message, confirmButtonText: 'Supprimer' })
    if (!confirmed) return

    setDeleting(true)
    try {
      await deleteUser.mutateAsync(user.id)
      await showSuccessAlert({ text: 'Utilisateur supprimé.' })
      navigate('/users')
    } catch (err) {
      await showErrorAlert({ text: err.message || 'Erreur lors de la suppression.' })
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-0 animate-fadeIn mb-10 md:mb-20 lg:mb-0">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/users')}
                className="text-slate-400 hover:text-violet-600 text-sm flex items-center gap-1 transition-colors">
          <ArrowLeft size={16} /> Retour
        </button>
        <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-xl font-bold text-slate-900">
          Profil utilisateur
        </h1>
      </div>

      <div className="space-y-6">
        {/* Carte d'identité */}
        <Card>
          <div className="p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <UserAvatar id={user.id} name={user.name} size="lg" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{user.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleCfg.bg} ${roleCfg.color}`}>
                      {roleCfg.label}
                    </span>
                    {user.isActive ? (
                      <span className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle size={12} /> Actif
                      </span>
                    ) : (
                      <span className="text-xs text-red-500 flex items-center gap-1">
                        <XCircle size={12} /> Inactif
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link to={`/users/${user.id}/edit`}
                      className="flex items-center gap-1.5 border-2 border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-semibold hover:border-violet-500 hover:text-violet-600 transition-colors">
                  <Edit size={16} /> Modifier
                </Link>
                <button onClick={handleDelete} disabled={deleting}
                        className="flex items-center gap-1.5 border-2 border-red-200 text-red-500 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors">
                  <Trash2 size={16} /> {deleting ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Coordonnées */}
        <Card>
          <div className="p-5 md:p-6">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Coordonnées</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Mail size={18} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="text-sm font-medium text-slate-800 break-all">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Phone size={18} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Téléphone</p>
                  <p className="text-sm font-medium text-slate-800">{user.phone || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Building2 size={18} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Agence</p>
                  <p className="text-sm font-medium text-slate-800">
                    {user.agency?.name ? `${user.agency.name} (${user.agency.city})` : 'Aucune'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Calendar size={18} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Inscrit le</p>
                  <p className="text-sm font-medium text-slate-800">
                    {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Statistiques colis (visible pour tous, mais pertinent surtout pour les clients) */}
        <Card>
          <div className="p-5 md:p-6">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Colis envoyés
            </h3>
            <UserStatsCards stats={user} />
          </div>
        </Card>
      </div>
    </div>
  )
}