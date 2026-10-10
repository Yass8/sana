// src/pages/users/UserForm.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Save, User } from 'lucide-react'
import {
  useUser,
  useCreateUser,
  useUpdateUser,
} from '../../hooks/useUsers'
import { useAgencies } from '../../hooks/useAgencies'
import { showSuccessAlert } from '../../components/ui/SweetsAlert'

// ────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────
const ROLES = [
  { value: 'client',   label: 'Client' },
  { value: 'agent_fr', label: 'Agent France' },
  { value: 'agent_af', label: 'Agent Afrique' },
  { value: 'admin',    label: 'Administrateur' },
]

// ────────────────────────────────────────────────────────────
// Primitives
// ────────────────────────────────────────────────────────────
function Section({ title, description, icon: Icon, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <header className="flex items-start gap-3 border-b border-slate-200 px-5 py-3.5">
        {Icon ? (
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Icon size={13} />
          </div>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  )
}

function Field({ label, htmlFor, required, error, children }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-medium text-slate-600"
      >
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-rose-600">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  )
}

function FormInput({ invalid, ...props }) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
        invalid
          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
          : 'border-slate-300 focus:border-slate-900 focus:ring-slate-900'
      }`}
    />
  )
}

function FormSelect({ invalid, children, ...props }) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`h-10 w-full appearance-none rounded-lg border bg-white pl-3 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-1 ${
          invalid
            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
            : 'border-slate-300 focus:border-slate-900 focus:ring-slate-900'
        }`}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  )
}

function PrimaryButton({ icon: Icon, loading, children, ...props }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

function GhostButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
    >
      {children}
    </button>
  )
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────
export default function UserForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const { data: user, isLoading: loadingUser } = useUser(id)
  const { data: agencies = [] } = useAgencies()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    adresse: '',
    role: 'client',
    agencyId: '',
    isActive: true,
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        adresse: user.adresse || '',
        role: user.role || 'client',
        agencyId: user.agencyId || '',
        isActive: user.isActive ?? true,
      })
    }
  }, [user])

  const setField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const setCheckbox = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.checked }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Requis'
    if (!form.email.trim()) e.email = 'Requis'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email invalide'
    if (form.role !== 'client' && !form.agencyId)
      e.agencyId = 'Requis pour ce rôle'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      adresse: form.adresse || null,
      role: form.role,
      agencyId: form.agencyId || null,
      isActive: form.isActive,
    }

    try {
      if (isEdit) {
        await updateUser.mutateAsync({ id, data: payload })
      } else {
        payload.sendMail = true
        await createUser.mutateAsync(payload)
        await showSuccessAlert({ text: 'Utilisateur ajouté.' })
      }
      navigate('/users')
    } catch (err) {
      setErrors({ submit: err.message })
    }
  }

  // ── Loading ───────────────────────────────────────────────
  if (isEdit && loadingUser) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-10">
        <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
        <div className="h-96 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
      </div>
    )
  }

  const showAgencySelect = form.role !== 'client'
  const isSubmitting = createUser.isPending || updateUser.isPending

  // ── Rendu ─────────────────────────────────────────────────
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-10">
      {/* En-tête */}
      <header>
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="inline-flex items-center gap-1 transition hover:text-slate-800"
          >
            <ArrowLeft size={12} />
            Utilisateurs
          </button>
          <span className="text-slate-300">/</span>
          <span className="font-medium text-slate-700">
            {isEdit ? 'Modifier' : 'Nouveau'}
          </span>
        </nav>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {isEdit ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isEdit
            ? 'Mettez à jour les informations et permissions du compte.'
            : 'Un email de bienvenue sera envoyé automatiquement avec les identifiants.'}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Section
          title="Informations générales"
          description="Identité et coordonnées de l'utilisateur."
          icon={User}
        >
          <div className="space-y-4 px-5 py-4">
            <Field
              label="Nom complet"
              htmlFor="name"
              required
              error={errors.name}
            >
              <FormInput
                id="name"
                type="text"
                value={form.name}
                onChange={setField('name')}
                invalid={Boolean(errors.name)}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Email"
                htmlFor="email"
                required
                error={errors.email}
              >
                <FormInput
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={setField('email')}
                  invalid={Boolean(errors.email)}
                />
              </Field>

              <Field label="Téléphone" htmlFor="phone">
                <FormInput
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={setField('phone')}
                />
              </Field>
            </div>

            <Field label="Adresse" htmlFor="adresse">
              <FormInput
                id="adresse"
                type="text"
                value={form.adresse}
                onChange={setField('adresse')}
              />
            </Field>
          </div>
        </Section>

        <Section
          title="Rôle & rattachement"
          description="Détermine les permissions et l'agence de l'utilisateur."
        >
          <div className="space-y-4 px-5 py-4">
            <Field label="Rôle" htmlFor="role">
              <FormSelect
                id="role"
                value={form.role}
                onChange={setField('role')}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </FormSelect>
            </Field>

            {showAgencySelect ? (
              <Field
                label="Agence"
                htmlFor="agencyId"
                required
                error={errors.agencyId}
              >
                <FormSelect
                  id="agencyId"
                  value={form.agencyId}
                  onChange={setField('agencyId')}
                  invalid={Boolean(errors.agencyId)}
                >
                  <option value="">— Sélectionner —</option>
                  {agencies.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.city})
                    </option>
                  ))}
                </FormSelect>
              </Field>
            ) : null}

            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={setCheckbox('isActive')}
                className="h-4 w-4 rounded border-slate-300 accent-slate-900 focus:ring-slate-900"
              />
              <span className="text-sm text-slate-700">Compte actif</span>
            </label>
          </div>
        </Section>

        {errors.submit ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-600" />
            <p className="text-sm text-rose-700">{errors.submit}</p>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <GhostButton
            type="button"
            onClick={() => navigate('/users')}
            className="sm:w-auto"
          >
            Annuler
          </GhostButton>
          <PrimaryButton
            type="submit"
            icon={Save}
            loading={isSubmitting}
            className="sm:w-auto"
          >
            {isSubmitting
              ? 'Enregistrement…'
              : isEdit
              ? 'Mettre à jour'
              : "Créer l'utilisateur"}
          </PrimaryButton>
        </div>
      </form>
    </div>
  )
}