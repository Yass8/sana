import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useUsers, useDesactivateUser, useSendBulkMessage } from '../../hooks/useUsers'
import Spinner from '../../components/ui/Spinner'
import { confirmDeleteAlert, showErrorAlert, showSuccessAlert } from '../../components/ui/SweetsAlert'
import UsersList from '../../components/users/UsersList'
import BulkMessageModal from '../../components/users/BulkMessageModal'

const ROLE_FILTERS = [
  { label: 'Tous',      value: '' },
  { label: 'Clients',   value: 'client' },
  { label: 'Agents FR', value: 'agent_fr' },
  { label: 'Agents AF', value: 'agent_af' },
  { label: 'Admins',    value: 'admin' },
]

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')      // '' = tous
  const [selected, setSelected] = useState(new Set())
  const [showModal, setShowModal] = useState(false)
  const [toasted, setToasted] = useState(false)

  const isClientView = roleFilter === 'client'

  const users = useUsers({ role: roleFilter || undefined, search: search || undefined })
  const desactivate = useDesactivateUser()
  const sendBulk = useSendBulkMessage()

  const data = users.data ?? []

  // sélection
  const toggleOne = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const toggleAll = (checked) => setSelected(checked ? new Set(data.map(u => u.id)) : new Set())

  // suppression (soft delete via désactivation)
  const handleDelete = async (id, name) => {
    const confirmed = await confirmDeleteAlert({ message: `Supprimer ${name} ?` })
    if (!confirmed) return
    try {
      await desactivate.mutateAsync(id)
      showSuccessAlert({ text: 'Utilisateur désactivé.' })
    } catch (err) {
      showErrorAlert({ text: err?.message || 'Erreur' })
    }
  }

  // envoi groupé réussi
  const handleBulkSent = () => {
    setShowModal(false)
    setSelected(new Set())
    setToasted(true)
    setTimeout(() => setToasted(false), 3000)
  }

  return (
    <div className="flex flex-col gap-5 animate-fadeIn mb-10 md:mb-25 lg:mb-0">
      {/* En-tête */}
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
        <div className="flex gap-2">
          {isClientView && selected.size > 0 && (
            <button onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-[#0A1628] hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all">
              Envoyer un message
              <span className="bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{selected.size}</span>
            </button>
          )}
          <Link to="/users/new"
                className="flex items-center gap-2 bg-[#0A1628] hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all">
            <Plus size={16} />
            Nouvel utilisateur
          </Link>
        </div>
      </div>

      {/* Toast succès */}
      {toasted && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl animate-fadeIn">
          ✅ Message envoyé aux client(s) sélectionné(s).
        </div>
      )}

      {/* Recherche */}
      <div className="flex items-center gap-2 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100 transition-all">
        <span className="text-slate-300">⌕</span>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
               placeholder="Nom, email…"
               className="flex-1 text-sm outline-none bg-transparent text-slate-900" />
        {search && <button onClick={() => setSearch('')} className="text-slate-300 hover:text-slate-500">✕</button>}
      </div>

      {/* Filtres de rôle */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        {ROLE_FILTERS.map(f => (
          <button key={f.value} onClick={() => { setRoleFilter(f.value); setSelected(new Set()) }}
                  className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-xl border-2 transition-all flex-shrink-0 font-semibold ${
                    roleFilter === f.value
                      ? 'bg-[#0A1628] text-white border-[#0A1628]'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Compteur de sélection (visible uniquement si pertinent) */}
      {isClientView && selected.size > 0 && (
        <p className="text-xs text-violet-600 font-semibold bg-violet-50 px-3 py-1.5 rounded-xl">
          {selected.size} client{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}
        </p>
      )}

      {/* Chargement / Liste */}
      {users.isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <UsersList
          data={data}
          roleFilter={roleFilter}
          selected={selected}
          onToggleOne={toggleOne}
          onToggleAll={toggleAll}
          onDelete={handleDelete}
        />
      )}

      {/* Modal envoi groupé (uniquement si vue client) */}
      {showModal && (
        <BulkMessageModal
          selected={selected}
          sendBulk={sendBulk}
          onClose={handleBulkSent}
        />
      )}
    </div>
  )
}