// src/components/layout/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Config des items selon le rôle
const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',      roles: ['agent_fr','agent_af','admin','client'] },
  { to: '/scan',       label: 'Scanner',         roles: ['agent_fr','agent_af','admin'] },
  { to: '/parcels',    label: 'Colis',           roles: ['agent_fr','agent_af','admin'] },
  { to: '/parcels/new',label: 'Nouveau colis',   roles: ['agent_fr','admin'] },
  { to: '/bags',       label: 'Sacs',            roles: ['agent_fr','admin'] },
  { to: '/shipments',  label: 'Envois',          roles: ['agent_fr','agent_af','admin'] },
  { to: '/clients',    label: 'Clients',         roles: ['admin'] },
  { to: '/notifications', label: 'Notifications', roles: ['admin'] },
]

export default function Sidebar() {
  const { user, logout, isRole } = useAuth()
  const navigate = useNavigate()

  const visibleItems = NAV_ITEMS.filter(item =>
    item.roles.includes(user?.role)
  )

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-52 bg-[#0F1923] flex flex-col flex-shrink-0">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <p style={{fontFamily:'var(--font-display)'}}
           className="text-[#F0EDE8] text-base font-extrabold tracking-tight">
          ColisTrack
        </p>
        <p className="text-[#E8673C] text-[10px] font-semibold tracking-widest uppercase mt-0.5">
          {user?.agency?.name ?? 'Agence'}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5">
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-[#E8673C] text-white font-medium'
                  : 'text-white/50 hover:text-[#F0EDE8] hover:bg-white/5'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Utilisateur connecté */}
      <div className="px-3 py-3 border-t border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#E8673C] flex items-center justify-center
                          text-white text-xs font-bold flex-shrink-0"
               style={{fontFamily:'var(--font-display)'}}>
            {user?.name?.slice(0,2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#F0EDE8] text-xs font-medium truncate">{user?.name}</p>
            <p className="text-white/40 text-[10px] truncate">{user?.role}</p>
          </div>
          <button onClick={handleLogout}
                  className="text-white/30 hover:text-[#E8673C] text-xs transition-colors">
            ⇥
          </button>
        </div>
      </div>

    </aside>
  )
}