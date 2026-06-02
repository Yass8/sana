// src/components/layout/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
// Import des icônes Lucide
import { 
  LayoutDashboard, 
  ScanLine, 
  Package, 
  ShoppingBag, 
  Plane, 
  Users, 
  Bell,
  LogOut 
} from 'lucide-react'

const NAV = [
  { to: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard, roles: ['agent_fr','agent_af','admin','client'] },
  { to: '/scan',          label: 'Scanner',       icon: ScanLine,        roles: ['agent_fr','agent_af','admin'] },
  { to: '/parcels',       label: 'Colis',         icon: Package,         roles: ['agent_fr','agent_af','admin','client'] },
  { to: '/bags',          label: 'Sacs',          icon: ShoppingBag,     roles: ['agent_fr','admin'] },
  { to: '/clients',       label: 'Clients',       icon: Users,           roles: ['admin'] },
  { to: '/users',       label: 'Utilisateurs',    icon: Users,           roles: ['admin'] },
  { to: '/notifications', label: 'Notifications', icon: Bell,            roles: ['admin'] },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const items             = NAV.filter(n => n.roles.includes(user?.role))

  return (
    <aside className="w-60 bg-[#0A1628] flex flex-col h-full">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <p style={{fontFamily:'var(--font-display)'}}
           className="text-white text-lg font-bold tracking-tight">
          SanaService
        </p>
        <p className="text-violet-400 text-[10px] font-semibold
                      tracking-widest uppercase mt-0.5">
          {user?.agency?.name ?? 'Tableau de bord'}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
               transition-all ${isActive
                 ? 'bg-violet-600 text-white font-semibold'
                 : 'text-white/50 hover:text-white hover:bg-white/5'
               }`
            }
          >
            {/* Rendu de l'icône avec une taille fixe pour l'alignement */}
            <item.icon size={18} strokeWidth={2.5} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center
                          justify-center text-white text-xs font-bold flex-shrink-0"
               style={{fontFamily:'var(--font-display)'}}>
            {user?.name?.slice(0,2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
            <p className="text-white/40 text-[10px] truncate">{user?.role}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="text-white/30 hover:text-red-400 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

    </aside>
  )
}