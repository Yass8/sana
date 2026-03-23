// src/components/layout/BottomNav.jsx
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: '/dashboard', label: 'Accueil', icon: '⊞', roles: ['agent_fr','agent_af','admin','client'] },
  { to: '/parcels',   label: 'Colis',   icon: '📦', roles: ['agent_fr','agent_af','admin','client'] },
  { to: '/scan',      label: 'Scanner', icon: '⬡',  roles: ['agent_fr','agent_af','admin'] },
  { to: '/bags',      label: 'Sacs',    icon: '🧳', roles: ['agent_fr','admin'] },
  { to: '/shipments', label: 'Envois',  icon: '✈️',  roles: ['agent_fr','agent_af','admin'] },
]

export default function BottomNav() {
  const { user } = useAuth()
  const items    = NAV.filter(n => n.roles.includes(user?.role)).slice(0, 5)

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t
                    border-slate-200 flex items-center justify-around
                    px-2 py-2 z-50 safe-area-bottom animate-slideUp">
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
          <span className="text-xl leading-none">{item.icon}</span>
          <span className="text-[10px] font-semibold">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}