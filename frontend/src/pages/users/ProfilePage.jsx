// src/pages/profile/ProfilePage.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useUser, useUpdateUser, useUpdatePassword } from '../../hooks/useUsers'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import { showSuccessAlert, showErrorAlert, confirmActionAlert } from '../../components/ui/SweetsAlert'

export default function ProfilePage() {
  const { user: authUser } = useAuth()
  const userId = authUser?.id

  const { data: user, isLoading, refetch } = useUser(userId)
  const updateUser = useUpdateUser()
  const updatePassword = useUpdatePassword()

  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      })
    }
  }, [user])

  if (isLoading || !userId) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex justify-center py-16 text-slate-400">
        Utilisateur introuvable
      </div>
    )
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    try {
      await updateUser.mutateAsync({ id: userId, data: form })
      await refetch()
      await showSuccessAlert({
        title: 'Profil mis à jour',
        text: 'Vos informations ont été enregistrées avec succès.',
      })
    } catch (error) {
      await showErrorAlert({
        title: 'Erreur',
        text: error.message || 'Impossible de mettre à jour le profil.',
      })
    }
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSavePassword = async (e) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      await showErrorAlert({
        title: 'Erreur',
        text: 'Les mots de passe ne correspondent pas.',
      })
      return
    }

    // Demander confirmation avant de changer le mot de passe
    const confirmed = await confirmActionAlert({
      title: 'Changer le mot de passe ?',
      message: 'Êtes-vous sûr de vouloir modifier votre mot de passe ?',
      confirmButtonText: 'Oui, changer',
    })

    if (!confirmed) return

    try {
      await updatePassword.mutateAsync({
        id: userId,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      await showSuccessAlert({
        title: 'Mot de passe modifié',
        text: 'Votre mot de passe a été mis à jour avec succès.',
      })
    } catch (error) {
      await showErrorAlert({
        title: 'Erreur',
        text: error.message || 'Impossible de changer le mot de passe.',
      })
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-fadeIn mb-10">

      <div>
        <h1 style={{ fontFamily: 'var(--font-display)' }}
            className="text-xl md:text-2xl font-bold text-slate-900">
          Mon profil
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Consultez et modifiez vos informations personnelles
        </p>
      </div>

      {/* Informations du compte (lecture seule) */}
      <Card>
        <div className="px-5 py-4 border-b border-slate-100">
          <p style={{ fontFamily: 'var(--font-display)' }}
             className="font-bold text-slate-900">
            Informations du compte
          </p>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Nom
            </label>
            <div className="text-sm font-medium text-slate-700">
              {user.name || '—'}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Rôle
            </label>
            <div className="text-sm font-medium text-slate-700 capitalize">
              {user.role?.replace('_', ' ') || '—'}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Agence
            </label>
            <div className="text-sm font-medium text-slate-700">
              {user.agency?.name || 'Aucune agence'}
            </div>
          </div>
        </div>
      </Card>

      {/* Formulaire profil modifiable */}
      <Card>
        <div className="px-5 py-4 border-b border-slate-100">
          <p style={{ fontFamily: 'var(--font-display)' }}
             className="font-bold text-slate-900">
            Informations personnelles
          </p>
        </div>
        <form onSubmit={handleSaveProfile}>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="name" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Nom complet
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none
                         focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition-all
                         bg-white text-slate-900"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none
                         focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition-all
                         bg-white text-slate-900"
              required
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Téléphone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none
                         focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition-all
                         bg-white text-slate-900"
            />
          </div>
          </div>
          <div className="flex justify-center p-5">
            <button
              type="submit"
              disabled={updateUser.isPending}
              className="w-full md:w-auto md:px-6 py-2.5 text-sm font-semibold text-white
                         bg-[#0A1628] hover:bg-slate-800 rounded-xl transition-colors
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {updateUser.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </Card>

      {/* Section Sécurité - version responsive */}
      <Card>
        <div className="px-5 py-4 border-b border-slate-100">
          <p style={{ fontFamily: 'var(--font-display)' }}
             className="font-bold text-slate-900">
            Sécurité
          </p>
        </div>
        <form onSubmit={handleSavePassword}>
        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <label htmlFor="currentPassword" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Mot de passe actuel
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none
                         focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition-all
                         bg-white text-slate-900"
              required
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Nouveau mot de passe
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none
                         focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition-all
                         bg-white text-slate-900"
              required
            />
          </div>
          <div className="flex flex-col md:flex-row lg:flex-col gap-2">
            <div className="flex-1">
              <label htmlFor="confirmPassword" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none
                           focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition-all
                           bg-white text-slate-900"
                required
              />
            </div>
        </div>
        </div>
        <div className="flex justify-center px-5 pb-5">
          <button
                type="submit"
                disabled={updatePassword.isPending}
                className="w-full lg:w-auto px-6 py-2.5 text-sm font-semibold text-white
                           bg-[#0A1628] hover:bg-slate-800 rounded-xl transition-colors
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {updatePassword.isPending ? 'Mise à jour...' : 'Changer le mot de passe'}
          </button>
        </div>
        
        </form>
      </Card>
    </div>
  )
}