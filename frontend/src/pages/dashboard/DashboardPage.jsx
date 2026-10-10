// src/pages/dashboard/DashboardPage.jsx
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Package,
  PackageCheck,
  TriangleAlert,
  Truck,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  useDashboardStats,
  useQuickActions,
} from '../../hooks/useDashboardStats'
import { useParcels } from '../../hooks/useParcels'
import StatusBadge from '../../components/ui/StatusBadge'
import QuickActionsPanel from '../../components/dashboard/QuickActionPannel'

// ────────────────────────────────────────────────────────────
// Stat
// ────────────────────────────────────────────────────────────
function Stat({ icon: Icon, label, value, helper, trend }) {
  return (
    <div className="flex items-start gap-3 bg-white px-5 py-4">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-xl font-semibold tabular-nums text-slate-900">
            {value ?? '—'}
          </p>
          {trend && (
            <span
              className={`text-xs font-medium tabular-nums ${
                trend > 0 ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              {trend > 0 ? `+${trend}` : trend} vs hier
            </span>
          )}
        </div>
        {helper ? (
          <p className="mt-0.5 text-xs text-slate-500">{helper}</p>
        ) : null}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Skeleton
// ────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div
            className="h-3 animate-pulse rounded bg-slate-100"
            style={{ width: `${55 + i * 10}%` }}
          />
        </td>
      ))}
    </tr>
  )
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const stats = useDashboardStats()
  const quickActions = useQuickActions()
  const parcels = useParcels({
    limit: 5,
    sortBy: 'createdAt',
    sortDir: 'DESC',
  })

  const s = stats.data ?? {}
  const data = parcels.data?.rows ?? []

  const dateLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const isStaff = user?.role !== 'client'

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-10">
      {/* En-tête */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Bonjour, {user?.name?.split(' ')[0] ?? ''}
        </h1>
        <p className="mt-1 text-sm capitalize text-slate-500">{dateLabel}</p>
      </header>

      {/* Bandeau de statistiques */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 lg:grid-cols-4">
        <Stat
          icon={Package}
          label="Colis aujourd'hui"
          value={s.todayCount}
          trend={s.todayDiff}
        />
        <Stat
          icon={Truck}
          label="Sacs en transit"
          value={s.bagsInTransit}
          helper="En cours d'acheminement"
        />
        <Stat
          icon={TriangleAlert}
          label="Problèmes actifs"
          value={s.issues}
          helper={s.issues > 0 ? 'Action requise' : 'Aucun problème'}
        />
        <Stat
          icon={PackageCheck}
          label="Livrés ce mois"
          value={s.monthDelivered}
          helper="Cumul du mois en cours"
        />
      </div>

      {/* Actions rapides (staff) */}
      {isStaff && (
        <QuickActionsPanel
          actions={quickActions.data}
          isLoading={quickActions.isLoading}
        />
      )}

      {/* Colis récents */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Colis récents
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Derniers colis enregistrés
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/parcels')}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-900"
          >
            Voir tout
            <ArrowRight size={12} />
          </button>
        </div>

        {parcels.isLoading && (
          <>
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-100 md:hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2 px-4 py-3.5">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </>
        )}

        {!parcels.isLoading && data.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Package size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                Aucun colis enregistré
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Les derniers colis créés apparaîtront ici.
              </p>
            </div>
          </div>
        )}

        {/* Vue mobile */}
        {!parcels.isLoading && data.length > 0 && (
          <div className="divide-y divide-slate-100 md:hidden">
            {data.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/parcels/${p.id}`)}
                className="cursor-pointer px-4 py-3.5 transition hover:bg-slate-50/70"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-medium text-slate-900">
                    {p.qrcode}
                  </span>
                  <StatusBadge status={p.status} updatedAt={p.updatedAt} />
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {p.sender?.name ?? '—'} → {p.recipientName ?? '—'}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Vue desktop */}
        {!parcels.isLoading && data.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5 text-left font-medium">Code</th>
                  <th className="px-4 py-2.5 text-left font-medium">
                    Expéditeur
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium">
                    Destinataire
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/parcels/${p.id}`)}
                    className="cursor-pointer border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-sm font-medium text-slate-900">
                        {p.qrcode}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      {p.sender?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      {p.recipientName ?? '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge
                        status={p.status}
                        updatedAt={p.updatedAt}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}