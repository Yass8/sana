export const PARCEL_STATUS = {
  received:            { label: 'Réceptionné',     color: 'blue',   step: 0 },
  departed_agency:     { label: 'Parti agence',    color: 'amber',  step: 1 },
  departed_airport:    { label: 'En vol',           color: 'violet', step: 2 },
  arrived_destination: { label: 'Arrivé dest.',    color: 'teal',   step: 3 },
  collected:           { label: 'Retiré',           color: 'green',  step: 4 },
  issue:               { label: 'Problème',         color: 'red',    step: -1 },
}

export const STATUS_COLORS = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   dot: 'bg-teal-500'   },
  green:  { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  red:    { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500'    },
}

export function getStatusCfg(status) {
  const s = PARCEL_STATUS[status]
  if (!s) return { label: status, ...STATUS_COLORS.blue }
  return { ...s, ...STATUS_COLORS[s.color] }
}

export const ROLES = {
  CLIENT:   'client',
  AGENT_FR: 'agent_fr',
  AGENT_AF: 'agent_af',
  ADMIN:    'admin',
}