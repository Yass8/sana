// src/pages/profile/ProfilePage.jsx
import { useState, useEffect } from 'react'
import {
  Building2,
  KeyRound,
  Save,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  useUser,
  useUpdateUser,
  useUpdatePassword,
} from '../../hooks/useUsers'
import {
  showSuccessAlert,
  showErrorAlert,
  confirmActionAlert,
} from '../../components/ui/SweetsAlert'

// ────────────────────────────────────────────────────────────
// Primitives
// ────────────────────────────────────────────────────────────
function Section({ title, description, icon: Icon, action, children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              {Icon ? <Icon size={14} className="text-slate-400" /> : null}
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            ) : null}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  const isEmpty = !value
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon size={13} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p
          className={`mt-0.5 truncate text-sm capitalize ${
            isEmpty ? 'text-slate-400' : 'font-medium text-slate-800'
          }`}
        >
          {isEmpty ? '—' : value}
        </p>
      </div>
    </div>
  )
}

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-medium text-slate-600"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function FormInput(props) {
  return (
    <input
      {...props}
      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50"
    />
  )
}

function PrimaryButton({ icon: Icon, loading, children, className = '', ...props }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : Icon ? (
        <Icon size={15} />
      ) : null}
      {children}
    </button>
  )
}

// ────────────────────────────────────────────────────────────
// Skeleton
// ────────────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-10">
      <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
      <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
      <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
      <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user: authUser } = useAuth()
  const userId = authUser?.id

  const { data: user, isLoading, refetch } = useUser(userId)
  const updateUser = useUpdateUser()
  const updatePassword = useUpdatePassword()

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    adresse: '',
  })
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
        adresse: user.adresse || '',
      })
    }
  }, [user])

  // ── Loading ───────────────────────────────────────────────
  if (isLoading || !userId) return <ProfileSkeleton />

  if (!user) {
    return (
      <div className="flex justify-center py-16 text-slate-500">
        Utilisateur introuvable
      </div>
    )
  }

  // ── Handlers ──────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
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
    setPasswordForm((prev) => ({ ...prev, [name]: value }))
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
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
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

  const roleLabel = user.role?.replace('_', ' ') || ''

  // ── Rendu ─────────────────────────────────────────────────
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-10">
      {/* En-tête */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Mon profil
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Consultez et modifiez vos informations personnelles.
        </p>
      </header>

      {/* Informations du compte */}
      <Section
        title="Informations du compte"
        description="Données de référence, non modifiables."
        icon={UserIcon}
      >
        <div className="divide-y divide-slate-100 sm:grid sm:grid-cols-3 sm:divide-y-0">
          <InfoRow icon={UserIcon} label="Nom" value={user.name} />
          <InfoRow icon={ShieldCheck} label="Rôle" value={roleLabel} />
          <InfoRow
            icon={Building2}
            label="Agence"
            value={user.agency?.name || 'Aucune agence'}
          />
        </div>
      </Section>

      {/* Informations personnelles */}
      <Section
        title="Informations personnelles"
        description="Ces informations apparaissent dans vos échanges et factures."
        icon={UserIcon}
      >
        <form onSubmit={handleSaveProfile}>
          <div className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-2">
            <Field label="Nom complet" htmlFor="name">
              <FormInput
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                required
              />
            </Field>

            <Field label="Email" htmlFor="email">
              <FormInput
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </Field>

            <Field label="Téléphone" htmlFor="phone">
              <FormInput
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
              />
            </Field>

            <Field label="Adresse" htmlFor="adresse">
              <FormInput
                id="adresse"
                name="adresse"
                type="text"
                value={form.adresse}
                onChange={handleChange}
              />
            </Field>
          </div>

          <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50/60 px-5 py-3">
            <PrimaryButton
              type="submit"
              icon={Save}
              loading={updateUser.isPending}
            >
              {updateUser.isPending
                ? 'Enregistrement…'
                : 'Enregistrer les modifications'}
            </PrimaryButton>
          </div>
        </form>
      </Section>

      {/* Sécurité */}
      <Section
        title="Sécurité"
        description="Modifiez votre mot de passe régulièrement."
        icon={KeyRound}
      >
        <form onSubmit={handleSavePassword}>
          <div className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-3">
            <Field label="Mot de passe actuel" htmlFor="currentPassword">
              <FormInput
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                required
              />
            </Field>

            <Field label="Nouveau mot de passe" htmlFor="newPassword">
              <FormInput
                id="newPassword"
                name="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                required
              />
            </Field>

            <Field label="Confirmer le mot de passe" htmlFor="confirmPassword">
              <FormInput
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                required
              />
            </Field>
          </div>

          <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50/60 px-5 py-3">
            <PrimaryButton
              type="submit"
              icon={KeyRound}
              loading={updatePassword.isPending}
            >
              {updatePassword.isPending
                ? 'Mise à jour…'
                : 'Changer le mot de passe'}
            </PrimaryButton>
          </div>
        </form>
      </Section>
    </div>
  )
}