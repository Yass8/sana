// src/components/layout/Topbar.jsx
import { useState }      from 'react'
import { useNavigate }   from 'react-router-dom'
import { useAuth }       from '../../context/AuthContext'
import { ScanLine } from 'lucide-react'

export default function Topbar() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const [open, setOpen]  = useState(false)

  return (
    <header className="bg-white border-b border-slate-100 px-4 md:px-6
                       py-3 flex items-center gap-3 flex-shrink-0 z-40">

      {/* Logo mobile */}
      <div className="lg:hidden">
        <p style={{fontFamily:'var(--font-display)'}}
           className="text-[#0A1628] font-bold text-base">
          SanaExpress
        </p>
      </div>

      <div className="flex-1"/>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Bouton scan rapide — mobile */}
        <button
          onClick={() => navigate('/scan')}
          className="lg:hidden flex items-center gap-1.5 bg-violet-600
                     text-white text-xs font-semibold px-3 py-2
                     rounded-xl transition-colors hover:bg-violet-700"
        >
          <ScanLine size={16} /> Scanner
        </button>

        {/* Avatar + menu */}
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="w-9 h-9 rounded-full bg-violet-600 flex items-center
                       justify-center text-white text-xs font-bold"
            style={{fontFamily:'var(--font-display)'}}
          >
            {user?.name?.slice(0,2).toUpperCase()}
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)}/>
              <div className="absolute right-0 top-full mt-2 w-52 bg-white
                              border border-slate-100 rounded-2xl shadow-xl
                              z-20 overflow-hidden animate-fadeIn">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
                  <span className="inline-block mt-1.5 text-[10px] font-semibold
                                   bg-violet-100 text-violet-700 px-2 py-0.5
                                   rounded-full">
                    {user?.role}
                  </span>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { logout(); navigate('/login'); setOpen(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm
                               text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Se déconnecter
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}