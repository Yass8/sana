// src/components/layout/Topbar.jsx
import { useState }        from 'react'
import { useNavigate }     from 'react-router-dom'
import { useAuth }         from '../../context/AuthContext'

export default function Topbar() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-slate-100 px-6 py-3.5
                       flex items-center gap-4 flex-shrink-0">

      {/* Barre de recherche rapide */}
      <div className="flex items-center gap-2 bg-slate-50 border
                      border-slate-200 rounded-lg px-3 py-2
                      flex-1 max-w-sm transition-all
                      focus-within:border-[#E8673C]
                      focus-within:ring-2 focus-within:ring-[#E8673C]/10">
        <span className="text-slate-300 text-sm flex-shrink-0">⌕</span>
        <input
          type="text"
          placeholder="Rechercher un colis…"
          onKeyDown={e => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              navigate(`/parcels?search=${encodeURIComponent(e.target.value.trim())}`)
              e.target.value = ''
            }
          }}
          className="bg-transparent text-sm outline-none text-[#0F1923]
                     placeholder-slate-300 w-full"
        />
      </div>

      <div className="flex-1" />

      {/* Lien scan rapide */}
      <button
        onClick={() => navigate('/scan')}
        className="hidden sm:flex items-center gap-2 text-xs font-medium
                   text-slate-500 hover:text-[#E8673C] border border-slate-200
                   hover:border-[#E8673C] px-3 py-2 rounded-lg
                   transition-all"
      >
        Scanner
      </button>

      {/* Menu utilisateur */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="flex items-center gap-2.5 hover:opacity-80
                     transition-opacity"
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full bg-[#E8673C] flex items-center
                       justify-center text-white text-xs font-bold flex-shrink-0"
            style={{fontFamily: 'var(--font-display)'}}
          >
            {user?.name?.slice(0, 2).toUpperCase()}
          </div>
          {/* Nom + rôle — masqué sur mobile */}
          <div className="hidden md:block text-left">
            <p className="text-xs font-medium text-[#0F1923] leading-tight">
              {user?.name}
            </p>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
              {user?.role}
            </p>
          </div>
          <span className="text-slate-300 text-xs">▾</span>
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <>
            {/* Overlay transparent pour fermer */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-48 bg-white
                            border border-slate-100 rounded-xl shadow-lg
                            z-20 overflow-hidden">
              {/* Info utilisateur */}
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-medium text-[#0F1923]">
                  {user?.name}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {user?.email}
                </p>
              </div>

              {/* Actions */}
              <div className="py-1">
                <button
                  onClick={() => { navigate('/scan'); setMenuOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm
                             text-slate-600 hover:bg-slate-50
                             transition-colors"
                >
                  Scanner un colis
                </button>
                <button
                  onClick={() => { navigate('/dashboard'); setMenuOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm
                             text-slate-600 hover:bg-slate-50
                             transition-colors"
                >
                  Dashboard
                </button>
              </div>

              {/* Déconnexion */}
              <div className="border-t border-slate-100 py-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm
                             text-red-500 hover:bg-red-50
                             transition-colors"
                >
                  Se déconnecter
                </button>
              </div>
            </div>
          </>
        )}
      </div>

    </header>
  )
}