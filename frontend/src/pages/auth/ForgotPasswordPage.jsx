// src/pages/auth/ForgotPasswordPage.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../../api/auth.api'
import Spinner from '../../components/ui/Spinner'
import { showErrorAlert } from '../../components/ui/SweetsAlert'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.forgotPassword({ email })
      setSent(true)
    } catch (err) {
      await showErrorAlert({ text: err?.message || 'Une erreur est survenue.' })
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Panneau gauche — branding */}
        <div className="bg-[#0A1628] lg:w-[420px] lg:flex-shrink-0 flex flex-col justify-between p-8 lg:p-12">
          <div>
            <p style={{ fontFamily: 'var(--font-display)' }}
               className="text-white text-2xl lg:text-3xl font-bold">SanaService</p>
            <p className="text-violet-400 text-xs font-semibold tracking-widest uppercase mt-1">France — Afrique</p>
          </div>
          <p className="hidden lg:block text-white/20 text-xs">© {new Date().getFullYear()} SanaService</p>
        </div>

        {/* Panneau droit — confirmation */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-50">
          <div className="w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-emerald-600" size={32} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)' }}
                className="text-2xl font-bold text-slate-900 mb-2">Email envoyé</h1>
            <p className="text-sm text-slate-500 mb-2">
              Si un compte existe avec <strong className="text-slate-700">{email}</strong>,
            </p>
            <p className="text-sm text-slate-500 mb-8">
              vous recevrez un lien de réinitialisation dans quelques instants.
            </p>
            <Link to="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors">
              <ArrowLeft size={16} /> Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* Panneau gauche — branding */}
      <div className="bg-[#0A1628] lg:w-[420px] lg:flex-shrink-0 flex flex-col justify-between p-8 lg:p-12">
        <div>
          <p style={{ fontFamily: 'var(--font-display)' }}
             className="text-white text-2xl lg:text-3xl font-bold">SanaService</p>
          <p className="text-violet-400 text-xs font-semibold tracking-widest uppercase mt-1">France — Afrique</p>
        </div>
        <p className="hidden lg:block text-white/20 text-xs">© {new Date().getFullYear()} SanaService</p>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-sm">

          <div className="mb-8">
            <h1 style={{ fontFamily: 'var(--font-display)' }}
                className="text-2xl font-bold text-slate-900 mb-1">Mot de passe oublié</h1>
            <p className="text-sm text-slate-500">
              Entrez votre email pour recevoir un lien de réinitialisation.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com" required
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
              {loading ? <><Spinner size="sm" color="white"/> Envoi…</> : 'Envoyer le lien'}
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