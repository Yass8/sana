// src/pages/auth/LoginPage.jsx
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLogin } from '../../hooks/useLogin'

export default function LoginPage() {
  const { user } = useAuth()
  const login    = useLogin()

  const [form, setForm] = useState({ email: '', password: '' })

  // Déjà connecté → redirige directement
  if (user) return <Navigate to="/dashboard" replace />

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    login.mutate(form)
  }

  // Message d'erreur lisible depuis la réponse Express
  const errorMsg = login.error?.message ?? 'Email ou mot de passe incorrect'

  return (
    <div className="min-h-screen flex">

      {/* ── Panneau gauche : branding ───────────────────── */}
      <div className="hidden lg:flex flex-col justify-between
                      w-[420px] bg-[#0F1923] p-12 flex-shrink-0">
        <div>
          <p style={{fontFamily:'var(--font-display)'}}
             className="text-[#F0EDE8] text-3xl font-extrabold tracking-tight">
            ColisTrack
          </p>
          <p className="text-[#E8673C] text-xs font-semibold
                        tracking-widest uppercase mt-1">
            Suivi de colis France — Afrique
          </p>
        </div>

        {/* Étapes de suivi — illustration */}
        <div className="space-y-5">
          {[
            { label: 'Réceptionné en agence',       done: true  },
            { label: 'Départ pour l\'aéroport',     done: true  },
            { label: 'En vol',                       done: false },
            { label: 'Arrivé à destination',         done: false },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center
                              justify-center text-xs font-bold flex-shrink-0
                              ${step.done
                                ? 'bg-[#E8673C] text-white'
                                : 'border border-white/20 text-white/30'}`}
                   style={{fontFamily:'var(--font-display)'}}>
                {step.done ? '✓' : i + 1}
              </div>
              <span className={`text-sm ${step.done
                ? 'text-[#F0EDE8]' : 'text-white/30'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <p className="text-white/20 text-xs">
          © {new Date().getFullYear()} ColisTrack
        </p>
      </div>

      {/* ── Panneau droit : formulaire ──────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F7F9FC]">
        <div className="w-full max-w-sm">

          {/* Header */}
          <div className="mb-8">
            <h1 style={{fontFamily:'var(--font-display)'}}
                className="text-2xl font-bold text-[#0F1923] mb-1">
              Connexion
            </h1>
            <p className="text-sm text-slate-500">
              Accès réservé au personnel et aux clients
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase
                                tracking-wide">
                Email
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="votre@email.com"
                required
                autoComplete="email"
                className="px-3 py-2.5 border-[1.5px] border-slate-200
                           rounded-lg text-sm text-[#0F1923] bg-white
                           outline-none transition-all
                           focus:border-[#E8673C] focus:ring-2
                           focus:ring-[#E8673C]/10"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase
                                tracking-wide">
                Mot de passe
              </label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="px-3 py-2.5 border-[1.5px] border-slate-200
                           rounded-lg text-sm text-[#0F1923] bg-white
                           outline-none transition-all
                           focus:border-[#E8673C] focus:ring-2
                           focus:ring-[#E8673C]/10"
              />
            </div>

            {/* Message d'erreur */}
            {login.isError && (
              <div className="bg-red-50 border border-red-200 text-red-700
                              text-sm px-4 py-3 rounded-lg">
                {errorMsg}
              </div>
            )}

            {/* Bouton submit */}
            <button
              type="submit"
              disabled={login.isPending}
              className="w-full bg-[#E8673C] hover:bg-[#D45A30]
                         disabled:opacity-60 disabled:cursor-not-allowed
                         text-white font-medium text-sm py-3 px-4
                         rounded-lg transition-all mt-2"
            >
              {login.isPending ? 'Connexion en cours…' : 'Se connecter'}
            </button>

          </form>

          {/* Lien suivi public */}
          <p className="text-center text-xs text-slate-400 mt-6">
            Vous souhaitez suivre un colis ?{' '}
            <a href="/track/COL-2026-00001"
               className="text-[#E8673C] hover:underline">
              Suivi public
            </a>
          </p>

        </div>
      </div>

    </div>
  )
}