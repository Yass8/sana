// src/components/ui/TrackingTimeline.jsx
import { getStatusConfig } from '../../constants/statusConfig'

const STEPS = [
  { status: 'received',            label: 'Réceptionné',      icon: '📦' },
  { status: 'departed_agency',     label: 'Parti agence',     icon: '🏢' },
  { status: 'departed_airport',    label: 'En vol',           icon: '✈' },
  { status: 'arrived_destination', label: 'Arrivé dest.',     icon: '📍' },
  { status: 'collected',           label: 'Retiré',           icon: '✓'  },
]

function formatDate(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function TrackingTimeline({ events = [], currentStatus }) {
  // Map events par status pour accès rapide
  const eventMap = events.reduce((acc, ev) => {
    acc[ev.status] = ev
    return acc
  }, {})

  const currentStep = STEPS.findIndex(s => s.status === currentStatus)
  const isIssue     = currentStatus === 'issue'

  return (
    <div className="flex flex-col gap-0">
      {STEPS.map((step, i) => {
        const isDone    = i < currentStep || currentStatus === step.status
        const isActive  = step.status === currentStatus
        const isPending = i > currentStep && !isActive
        const event     = eventMap[step.status]
        const isLast    = i === STEPS.length - 1

        return (
          <div key={step.status} className="flex gap-4">

            {/* Colonne gauche : cercle + ligne verticale */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center
                              justify-center text-sm flex-shrink-0
                              transition-all ${
                isDone && !isActive
                  ? 'bg-[#E8673C] text-white'
                  : isActive && !isIssue
                    ? 'bg-[#0F1923] text-white ring-4 ring-[#E8673C]/20'
                    : isActive && isIssue
                      ? 'bg-red-500 text-white ring-4 ring-red-200'
                      : 'bg-slate-100 text-slate-300 border border-slate-200'
              }`}>
                {isDone && !isActive ? '✓' : step.icon}
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 my-1 min-h-[24px] ${
                  isDone ? 'bg-[#E8673C]' : 'bg-slate-100'
                }`} />
              )}
            </div>

            {/* Colonne droite : label + date + agent */}
            <div className={`pb-5 flex-1 ${isLast ? 'pb-0' : ''}`}>
              <div className="flex items-baseline justify-between gap-2">
                <p className={`text-sm font-medium ${
                  isActive   ? 'text-[#0F1923]'
                  : isDone   ? 'text-[#0F1923]'
                  : 'text-slate-300'
                }`}>
                  {step.label}
                </p>
                {event && (
                  <span className="text-[10px] text-slate-400 flex-shrink-0">
                    {formatDate(event.occurredAt)}
                  </span>
                )}
              </div>

              {/* Détails de l'event si disponible */}
              {event && (
                <div className="mt-1 flex flex-col gap-0.5">
                  {event.agent && (
                    <p className="text-[11px] text-slate-400">
                      par {event.agent.name}
                      {event.location ? ` · ${event.location}` : ''}
                    </p>
                  )}
                  {event.notes && (
                    <p className="text-[11px] text-slate-500 italic">
                      "{event.notes}"
                    </p>
                  )}
                </div>
              )}
            </div>

          </div>
        )
      })}

      {/* Étape issue en dehors de la timeline normale */}
      {isIssue && (
        <div className="mt-3 flex gap-3 bg-red-50 border border-red-100
                        rounded-xl p-4">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center
                          justify-center text-red-500 text-sm flex-shrink-0">
            !
          </div>
          <div>
            <p className="text-sm font-medium text-red-700">Problème signalé</p>
            {eventMap['issue'] && (
              <p className="text-[11px] text-red-500 mt-0.5">
                {eventMap['issue'].notes ?? 'Aucun détail fourni.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}