// src/components/layout/BottomNav.jsx
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LayoutDashboard, Package, Plane, ScanLine, ShoppingBag } from 'lucide-react'

const NAV = [
  { to: '/dashboard', label: 'Accueil', icon: LayoutDashboard, roles: ['agent_fr','agent_af','admin','client'] },
  { to: '/parcels',   label: 'Colis',   icon: Package, roles: ['agent_fr','agent_af','admin','client'] },
  { to: '/scan',      label: 'Scanner', icon: ScanLine,  roles: ['agent_fr','agent_af','admin'] },
  { to: '/bags',      label: 'Sacs',    icon: ShoppingBag, roles: ['agent_fr','admin'] },
]

export default function BottomNav() {
  const { user } = useAuth()
  const items    = NAV.filter(n => n.roles.includes(user?.role)).slice(0, 5)

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t
                    border-slate-200 flex items-center justify-around
                    px-4 py-5 z-50 safe-area-bottom animate-slideUp">
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/dashboard'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl
             transition-all ${isActive
               ? 'text-violet-600'
               : 'text-slate-400'
             }`
          }
        >
          <item.icon size={18} strokeWidth={2.5} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}