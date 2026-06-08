import { Link } from 'react-router-dom'
import { Mail, Phone, Edit, Trash2, Calendar } from 'lucide-react'
import UserAvatar from '../ui/UserAvatar'
import Card from '../ui/Card'

const ROLE_CFG = {
  client:   { label: 'Client',    color: 'text-emerald-700', bg: 'bg-emerald-50' },
  agent_fr: { label: 'Agent FR',  color: 'text-blue-700',    bg: 'bg-blue-50' },
  agent_af: { label: 'Agent AF',  color: 'text-purple-700',  bg: 'bg-purple-50' },
  admin:    { label: 'Admin',     color: 'text-amber-700',   bg: 'bg-amber-50' },
}

export default function UsersList({
  data,
  roleFilter,
  selected,
  onToggleOne,
  onToggleAll,
  onDelete,
}) {
  const isClientView = roleFilter === 'client'
  const allChecked = data.length > 0 && data.every(u => selected.has(u.id))

  const renderMobile = () =>
    data.map(u => {
      const role = ROLE_CFG[u.role] || { label: u.role, color: 'text-slate-600', bg: 'bg-slate-100' }
      return (
        <div key={u.id} className="px-4 py-3.5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              {isClientView && (
                <input
                  type="checkbox"
                  checked={selected.has(u.id)}
                  onChange={() => onToggleOne(u.id)}
                  onClick={e => e.stopPropagation()}
                  className="accent-violet-600 w-4 h-4 mt-0.5"
                />
              )}
              <UserAvatar id={u.id} name={u.name} />
              <div className="flex-1 min-w-0">
                <Link to={`/users/${u.id}`} className="text-sm font-semibold text-slate-800 hover:text-violet-600 block truncate">
                  {u.name}
                </Link>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Mail size={12} /> <span className="truncate">{u.email}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link to={`/users/${u.id}/edit`} className="p-1.5 text-slate-400 hover:text-violet-600"><Edit size={14} /></Link>
              <button onClick={() => onDelete(u.id, u.name)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            {u.phone && <span className="flex items-center gap-1"><Phone size={12} /> {u.phone}</span>}
            {isClientView && (
              <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                {u.parcelsCount ?? 0} colis
              </span>
            )}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${role.bg} ${role.color}`}>
              {role.label}
            </span>
          </div>
        </div>
      )
    })

  const renderDesktop = () => (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-100">
          {isClientView && (
            <th className="w-10 px-5 py-3">
              <input type="checkbox" checked={allChecked} onChange={e => onToggleAll(e.target.checked)}
                     className="accent-violet-600 w-4 h-4 cursor-pointer" />
            </th>
          )}
          <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Utilisateur</th>
          {!isClientView && <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Rôle</th>}
          <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Téléphone</th>
          {isClientView && (
            <>
              <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Colis</th>
              <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Inscrit le</th>
            </>
          )}
          <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.length === 0 && (
          <tr><td colSpan={isClientView ? 6 : 4} className="text-center py-14 text-sm text-slate-400">Aucun utilisateur.</td></tr>
        )}
        {data.map(u => {
          const role = ROLE_CFG[u.role] || { label: u.role, color: 'text-slate-600', bg: 'bg-slate-100' }
          return (
            <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors">
              {isClientView && (
                <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(u.id)} onChange={() => onToggleOne(u.id)}
                         className="accent-violet-600 w-4 h-4 cursor-pointer" />
                </td>
              )}
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <Link to={`/users/${u.id}`}><UserAvatar id={u.id} name={u.name} size="sm" /></Link>
                  <div>
                    <Link to={`/users/${u.id}`} className="text-xs font-semibold text-slate-800 hover:text-violet-600 block">
                      {u.name}
                    </Link>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Mail size={11} /> <span className="truncate">{u.email}</span>
                    </div>
                  </div>
                </div>
              </td>
              {!isClientView && (
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${role.bg} ${role.color}`}>
                    {role.label}
                  </span>
                </td>
              )}
              <td className="px-5 py-3.5 text-xs text-slate-500">{u.phone ?? '—'}</td>
              {isClientView && (
                <>
                  <td className="px-5 py-3.5">
                    <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {u.parcelsCount ?? 0} colis
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[11px] text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </>
              )}
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-1">
                  <Link to={`/users/${u.id}/edit`} className="p-1.5 text-slate-400 hover:text-violet-600"><Edit size={14} /></Link>
                  <button onClick={() => onDelete(u.id, u.name)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  return (
    <Card>
      <div className="md:hidden divide-y divide-slate-100">
        {renderMobile()}
      </div>
      <div className="hidden md:block overflow-x-auto">
        {renderDesktop()}
      </div>
    </Card>
  )
}