export const STATUS_CONFIG = {
  // ── Statuts colis (existant) ──
  received: {
    label: 'Réceptionné',
    bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', step: 0,
  },
  departed_airport: {
    label: 'En vol',
    bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', step: 1,
  },
  arrived_destination: {
    label: 'Arrivé destination',
    bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', step: 2,
  },
  collected: {
    label: 'Retiré',
    bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', step: 4,
  },
  issue: {
    label: 'Problème',
    bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500', step: -1,
  },
  problème: {
    label: 'Problème',
    bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500', step: -1,
  },

  // ── Statuts sac ──
  open: {
    label: 'Ouvert',
    bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500',
  },
  ouvert: {
    label: 'Ouvert',
    bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500',
  },
  closed: {
    label: 'Fermé',
    bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500',
  },
  fermé: {
    label: 'Fermé',
    bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500',
  },
  in_transit: {
    label: 'En transit',
    bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500',
  },
  en_transit: {
    label: 'En transit',
    bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500',
  },
  arrived: {
    label: 'Arrivé',
    bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500',
  },
  arrivé: {
    label: 'Arrivé',
    bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500',
  },
}

export function getStatusConfig(status) {
  const normalized = String(status ?? '').trim().toLowerCase()
  const config = STATUS_CONFIG[normalized] ?? STATUS_CONFIG[status]

  return config ?? {
    label: status ?? 'Inconnu',
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
  }
}