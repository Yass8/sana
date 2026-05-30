export const STATUS_CONFIG = {
  // ── Statuts colis (existant) ──
  received: {
    label: 'Réceptionné',
    bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', step: 0,
  },
  departed_agency: {
    label: 'Parti agence',
    bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', step: 1,
  },
  departed_airport: {
    label: 'En vol',
    bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', step: 2,
  },
  arrived_destination: {
    label: 'Arrivé destination',
    bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', step: 3,
  },
  collected: {
    label: 'Retiré',
    bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', step: 4,
  },
  issue: {
    label: 'Problème',
    bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', step: -1,
  },

  // ── Statuts sac (nouveau) ──
  open: {
    label: 'Ouvert',
    bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500',
  },
  closed: {
    label: 'Fermé',
    bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-500',
  },
  in_transit: {
    label: 'En transit',
    bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500',
  },
  arrived: {
    label: 'Arrivé',
    bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500',
  },
}

export function getStatusConfig(status) {
  return STATUS_CONFIG[status] ?? {
    label: status,
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
  }
}