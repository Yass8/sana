// src/pages/users/UserDetail.jsx
import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useUser, useDeleteUser } from '../../hooks/useUsers'
import UserAvatar from '../../components/ui/UserAvatar'
import UserStatsCards from '../../components/users/UserStatsCards'
import {
  confirmDeleteAlert,
  showErrorAlert,
  showSuccessAlert,
} from '../../components/ui/SweetsAlert'

// ────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────
const ROLE_META = {
  client:   { label: 'Client',   dot: 'bg-emerald-500' },
  agent_fr: { label: 'Agent FR', dot: 'bg-slate-500' },
  agent_af: { label: 'Agent AF', dot: 'bg-slate-500' },
  admin:    { label: 'Admin',    dot: 'bg-slate-900' },
}

// ────────────────────────────────────────────────────────────
// Primitives
// ────────────────────────────────────────────────────────────
function Section({ title, description, action, children, className = '' }) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
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

function RoleBadge({ role }) {
  const meta = ROLE_META[role] || { label: role, dot: 'bg-slate-400' }
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

function StatusBadge({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
      Actif
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
      Inactif
    </span>
  )
}

function InfoRow({ icon: Icon, label, value, mono = false }) {
  const isEmpty = value === null || value === undefined || value === ''
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
          className={`mt-0.5 truncate text-sm ${
            isEmpty ? 'text-slate-400' : 'font-medium text-slate-800'
          } ${mono ? 'font-mono text-xs' : ''}`}
        >
          {isEmpty ? '—' : value}
        </p>
      </div>
    </div>
  )
}

function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────
export default function UserDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { data: user, isLoading } = useUser(id)
  const deleteUser = useDeleteUser()
  const [deleting, setDeleting] = useState(false)

  // ── Loading ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-10">
        <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
        <SkeletonBlock className="h-24" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <SkeletonBlock className="h-72" />
          <SkeletonBlock className="h-72" />
        </div>
      </div>
    )
  }

  // ── Not found ─────────────────────────────────────────────
  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <XCircle size={18} />
        </div>
        <p className="text-sm font-medium text-slate-700">Utilisateur introuvable</p>
        <button
          type="button"
          onClick={() => navigate('/users')}
          className="mt-1 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft size={14} />
          Retour à la liste
        </button>
      </div>
    )
  }

  // ── Handlers ──────────────────────────────────────────────
  const handleDelete = async () => {
    const message = `Supprimer définitivement ${user.name} ? Toutes ses données (colis, historique, etc.) seront perdues.`
    const confirmed = await confirmDeleteAlert({
      message,
      confirmButtonText: 'Supprimer',
    })
    if (!confirmed) return

    setDeleting(true)
    try {
      await deleteUser.mutateAsync(user.id)
      await showSuccessAlert({ text: 'Utilisateur supprimé.' })
      navigate('/users')
    } catch (err) {
      await showErrorAlert({
        text: err.message || 'Erreur lors de la suppression.',
      })
      setDeleting(false)
    }
  }

  const hasAgency = Boolean(user.agency?.name)

  // ── Rendu ─────────────────────────────────────────────────
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-10">
      {/* Fil d'Ariane + En-tête */}
      <header>
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link to="/users" className="transition hover:text-slate-800">
            Utilisateurs
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-medium text-slate-700">{user.name}</span>
        </nav>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <UserAvatar id={user.id} name={user.name} size="lg" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {user.name}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <RoleBadge role={user.role} />
                <StatusBadge active={user.isActive} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/users/${user.id}/edit`}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              <Pencil size={14} />
              Modifier
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 bg-white px-3.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
              ) : (
                <Trash2 size={14} />
              )}
              {deleting ? 'Suppression…' : 'Supprimer'}
            </button>
          </div>
        </div>
      </header>

      {/* Corps */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Coordonnées */}
        <Section
          title="Coordonnées"
          description="Informations de contact et rattachement."
        >
          <div className="divide-y divide-slate-100">
            <InfoRow icon={Mail} label="Email" value={user.email} />
            <InfoRow icon={Phone} label="Téléphone" value={user.phone} />
            <InfoRow icon={MapPin} label="Adresse" value={user.adresse} />
            <InfoRow
              icon={Building2}
              label="Agence"
              value={
                hasAgency
                  ? `${user.agency.name} · ${user.agency.city ?? ''}`.trim()
                  : 'Aucune'
              }
              empty="Aucune"
            />
            <InfoRow
              icon={Calendar}
              label="Inscrit le"
              value={new Date(user.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            />
          </div>
        </Section>

        {/* Statistiques */}
        <Section
          title="Colis envoyés"
          description="Activité cumulée de cet utilisateur."
        >
          <div className="px-5 py-4">
            <UserStatsCards stats={user} />
          </div>
        </Section>
      </div>
    </div>
  )
}