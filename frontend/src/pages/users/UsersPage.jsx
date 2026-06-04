// src/pages/users/UsersPage.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUsers, useDesactivateUser } from '../../hooks/useUsers'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'

import { User, Mail, Phone, Edit, Trash2, Plus } from 'lucide-react'
import { confirmDeleteAlert, showErrorAlert, showSuccessAlert } from '../../components/ui/SweetsAlert'

const AVATAR_COLORS = ['#7C3AED', '#059669', '#2563EB', '#D97706', '#DC2625']
const avatarColor = (id) => AVATAR_COLORS[id?.charCodeAt(0) % AVATAR_COLORS.length] ?? '#7C3AED'
const initials = (name) => name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() ?? '?'

const ROLE_CONFIG = {
  client:   { label: 'Client',    color: 'text-emerald-700', bg: 'bg-emerald-50', icon: User },
  agent_fr: { label: 'Agent FR',  color: 'text-blue-700',    bg: 'bg-blue-50',    icon: User },
  agent_af: { label: 'Agent AF',  color: 'text-purple-700',  bg: 'bg-purple-50',  icon: User },
  admin:    { label: 'Admin',     color: 'text-amber-700',   bg: 'bg-amber-50',   icon: User },
}

const FILTERS = [
  { label: 'Tous',     value: '' },
  { label: 'Clients',  value: 'client' },
  { label: 'Agents FR', value: 'agent_fr' },
  { label: 'Agents AF', value: 'agent_af' },
  { label: 'Admins',   value: 'admin' },
]

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const users = useUsers({ role: roleFilter || undefined, search: search || undefined })
  const desactivateUser = useDesactivateUser()

  const data = users.data ?? []

  const handleDelete = async (id, name) => {
    const message = `Supprimer ${name} ? Cette action est irréversible.`
    const confirmed = await confirmDeleteAlert({ message })
    if (!confirmed) return

    try {
      await desactivateUser.mutateAsync(id)
      await showSuccessAlert({ text: `Utilisateur supprimé.` })
    } catch (err) {
      await showErrorAlert({ text: err })
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-fadeIn mb-10 md:mb-25 lg:mb-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)' }}
              className="text-xl md:text-2xl font-bold text-slate-900">
            Gestion des utilisateurs
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {data.length} utilisateur{data.length > 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to="/users/new"
          className="flex items-center gap-2 bg-[#0A1628] hover:bg-slate-800
                     text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
        >
          <Plus size={16} />
          Nouvel utilisateur
        </Link>
      </div>

      {/* Recherche */}
      <div className="flex items-center gap-2 bg-white border-2 border-slate-200
                      rounded-xl px-4 py-3 focus-within:border-violet-500
                      focus-within:ring-4 focus-within:ring-violet-100 transition-all">
        <span className="text-slate-300">⌕</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Nom, email…"
          className="flex-1 text-sm outline-none bg-transparent text-slate-900"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-slate-300 hover:text-slate-500">✕</button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setRoleFilter(f.value)}
            className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-xl
                        border-2 transition-all flex-shrink-0 font-semibold ${
              roleFilter === f.value
                ? 'bg-[#0A1628] text-white border-[#0A1628]'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {users.isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <Card>
          {/* Mobile */}
          <div className="md:hidden divide-y divide-slate-100">
            {data.length === 0 && <p className="text-center text-sm text-slate-400 py-12">Aucun utilisateur.</p>}
            {data.map(u => {
              const roleCfg = ROLE_CONFIG[u.role] || { label: u.role, color: 'text-slate-600', bg: 'bg-slate-100', icon: User }
              const Icon = roleCfg.icon
              return (
                <div key={u.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                           style={{ background: avatarColor(u.id), fontFamily: 'var(--font-display)' }}>
                        {initials(u.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link to={`/users/${u.id}`}
                              className="text-sm font-semibold text-slate-800 hover:text-violet-600">
                          {u.name}
                        </Link>
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Mail size={12} /> <span className="truncate">{u.email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link to={`/users/${u.id}/edit`}
                            className="p-1.5 text-slate-400 hover:text-violet-600">
                        <Edit size={14} />
                      </Link>
                      <button onClick={() => handleDelete(u.id, u.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    {u.phone && <span className="flex items-center gap-1"><Phone size={12} /> {u.phone}</span>}
                    {/* {u.agency && <span className="flex items-center gap-1"><Building2 size={12} /> {u.agency.name}</span>}
                    <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(u.createdAt).toLocaleDateString('fr-FR')}</span> */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${roleCfg.bg} ${roleCfg.color}`}>
                      <Icon size={10} /> {roleCfg.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {/* {['Utilisateur', 'Rôle', 'Téléphone', 'Agence', 'Inscrit le', 'Actions'].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">{h}</th>
                  ))} */}
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Utilisateur</th>
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Rôle</th>
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Téléphone</th>
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Action</th>
                  {/* 
                  <th className="border text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Agence</th>
                  <th className="border text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Inscrit le</th>
                   */}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 && (
                  <tr><td colSpan="6" className="text-center py-14 text-sm text-slate-400">Aucun utilisateur.</td></tr>
                )}
                {data.map(u => {
                  const roleCfg = ROLE_CONFIG[u.role] || { label: u.role, color: 'text-slate-600', bg: 'bg-slate-100', icon: User }
                  const Icon = roleCfg.icon
                  return (
                    <tr key={u.id} className="border-b border-red-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                               style={{ background: avatarColor(u.id), fontFamily: 'var(--font-display)' }}>
                            <Link to={`/users/${u.id}`}>{initials(u.name)}</Link>
                          </div>
                          <div>
                            <Link to={`/users/${u.id}`}
                                  className="text-xs font-semibold text-slate-800 hover:text-violet-600">
                              {u.name}
                            </Link>
                            <span className="flex items-center gap-1 text-[11px] text-slate-400"><i>Status:</i>{u.isActive ? 'Actif' : 'Désactivé'}</span>
                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                              <Mail size={11} /> <span className="truncate">{u.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleCfg.bg} ${roleCfg.color}`}>
                          <Icon size={10} /> {roleCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 flex items-center gap-1">
                        <Phone size={12} /> {u.phone ?? '—'}
                      </td>
                      {/* 
                      <td className="px-5 py-3.5 text-xs text-slate-500 flex items-center gap-1">
                        <Building2 size={12} /> {u.agency?.name ?? '—'}
                      </td>
                      <td className="px-5 py-3.5 text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(u.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td> */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <Link to={`/users/${u.id}/edit`}
                                className="p-1.5 text-slate-400 hover:text-violet-600">
                            <Edit size={14} />
                          </Link>
                          <button onClick={() => handleDelete(u.id, u.name)}
                                  className="p-1.5 text-slate-400 hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}