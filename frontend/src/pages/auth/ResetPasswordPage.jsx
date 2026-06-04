// src/pages/auth/ResetPasswordPage.jsx
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { authApi } from '../../api/auth.api'
import Spinner from '../../components/ui/Spinner'
import { showSuccessAlert, showErrorAlert } from '../../components/ui/SweetsAlert'
import { Lock, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      showErrorAlert({ text: 'Lien invalide ou expiré.' }).then(() => navigate('/login'))
    }
  }, [token, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password !== confirm) {
      await showErrorAlert({ text: 'Les mots de passe ne correspondent pas.' })
      return
    }
    if (password.length < 6) {
      await showErrorAlert({ text: 'Le mot de passe doit contenir au moins 6 caractères.' })
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword({ token, password })
      setDone(true)
      await showSuccessAlert({ text: 'Mot de passe mis à jour avec succès.' })
    } catch (err) {
      await showErrorAlert({ text: err?.message || 'Lien invalide ou expiré.' })
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        <div className="bg-[#0A1628] lg:w-[420px] lg:flex-shrink-0 flex flex-col justify-between p-8 lg:p-12">
          <div>
            <p style={{ fontFamily: 'var(--font-display)' }}
               className="text-white text-2xl lg:text-3xl font-bold">SanaService</p>
            <p className="text-violet-400 text-xs font-semibold tracking-widest uppercase mt-1">France — Afrique</p>
          </div>
          <p className="hidden lg:block text-white/20 text-xs">© {new Date().getFullYear()} SanaService</p>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-50">
          <div className="w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-emerald-600" size={32} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)' }}
                className="text-2xl font-bold text-slate-900 mb-2">Mot de passe réinitialisé</h1>
            <p className="text-sm text-slate-500 mb-8">
              Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>
            <Link to="/login"
                  className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors">
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      <div className="bg-[#0A1628] lg:w-[420px] lg:flex-shrink-0 flex flex-col justify-between p-8 lg:p-12">
        <div>
          <p style={{ fontFamily: 'var(--font-display)' }}
             className="text-white text-2xl lg:text-3xl font-bold">SanaService</p>
          <p className="text-violet-400 text-xs font-semibold tracking-widest uppercase mt-1">France — Afrique</p>
        </div>
        <p className="hidden lg:block text-white/20 text-xs">© {new Date().getFullYear()} SanaService</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-sm">

          <div className="mb-8">
            <h1 style={{ fontFamily: 'var(--font-display)' }}
                className="text-2xl font-bold text-slate-900 mb-1">Nouveau mot de passe</h1>
            <p className="text-sm text-slate-500">Choisissez un mot de passe sécurisé.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required minLength={6}
                  className="w-full pl-10 pr-10 py-3 border-2 border-slate-200 rounded-xl
                             text-sm outline-none transition-all
                             focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••" required
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl
                             text-sm outline-none transition-all
                             focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700
                         disabled:opacity-60 text-white font-semibold
                         py-3.5 rounded-xl transition-all mt-2
                         flex items-center justify-center gap-2"
            >
              {loading ? <><Spinner size="sm" color="white"/> Mise à jour…</> : 'Réinitialiser le mot de passe'}
            </button>

          </form>

          <div className="mt-6 text-center">
            <Link to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-600 transition-colors">
              <ArrowLeft size={14} /> Retour à la connexion
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}