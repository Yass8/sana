// src/pages/auth/LoginPage.jsx
import { useState }     from 'react'
import { Navigate }     from 'react-router-dom'
import { useAuth }      from '../../context/AuthContext'
import { useLogin }     from '../../hooks/useLogin'
import Spinner          from '../../components/ui/Spinner'

export default function LoginPage() {
  const { user }  = useAuth()
  const login     = useLogin()
  const [form, setForm] = useState({ email: '', password: '' })

  if (user) return <Navigate to="/dashboard" replace />

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* Panneau gauche — branding */}
      <div className="bg-[#0A1628] lg:w-[420px] lg:flex-shrink-0
                      flex flex-col justify-between p-8 lg:p-12">
        <div>
          <p style={{fontFamily:'var(--font-display)'}}
             className="text-white text-2xl lg:text-3xl font-bold">
            ColisTrack
          </p>
          <p className="text-violet-400 text-xs font-semibold
                        tracking-widest uppercase mt-1">
            France — Afrique
          </p>
        </div>

        {/* Étapes — masquées sur mobile */}
        <div className="hidden lg:flex flex-col gap-5">
          {[
            { label: 'Réception en agence', done: true  },
            { label: 'Départ aéroport',     done: true  },
            { label: 'En vol',               done: false },
            { label: 'Arrivée destination',  done: false },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center
                              justify-center text-xs font-bold flex-shrink-0 ${
                s.done ? 'bg-violet-600 text-white' : 'border border-white/20 text-white/30'
              }`}>
                {s.done ? '✓' : i + 1}
              </div>
              <span className={`text-sm ${s.done ? 'text-white' : 'text-white/30'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <p className="hidden lg:block text-white/20 text-xs">
          © {new Date().getFullYear()} ColisTrack
        </p>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex items-center justify-center
                      p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-sm">

          <div className="mb-8">
            <h1 style={{fontFamily:'var(--font-display)'}}
                className="text-2xl font-bold text-slate-900 mb-1">
              Connexion
            </h1>
            <p className="text-sm text-slate-500">
              Accès réservé au personnel et aux clients
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); login.mutate(form) }}
                className="flex flex-col gap-4">

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email" value={form.email} onChange={set('email')}
                placeholder="votre@email.com" required autoComplete="email"
                className="px-4 py-3 border-2 border-slate-200 rounded-xl
                           text-sm outline-none transition-all
                           focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Mot de passe
              </label>
              <input
                type="password" value={form.password} onChange={set('password')}
                placeholder="••••••••" required autoComplete="current-password"
                className="px-4 py-3 border-2 border-slate-200 rounded-xl
                           text-sm outline-none transition-all
                           focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              />
            </div>

            {login.isError && (
              <div className="bg-red-50 border border-red-200 text-red-600
                              text-sm px-4 py-3 rounded-xl">
                {login.error?.message ?? 'Email ou mot de passe incorrect.'}
              </div>
            )}

            <button
              type="submit" disabled={login.isPending}
              className="w-full bg-violet-600 hover:bg-violet-700
                         disabled:opacity-60 text-white font-semibold
                         py-3.5 rounded-xl transition-all mt-2
                         flex items-center justify-center gap-2"
            >
              {login.isPending ? <><Spinner size="sm" color="white"/> Connexion…</> : 'Se connecter'}
            </button>

          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Suivre un colis ?{' '}
            <a href="/track/COL-2026-00001"
               className="text-violet-600 hover:underline font-semibold">
              Suivi public
            </a>
          </p>

        </div>
      </div>
    </div>
  )
}