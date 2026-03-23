// src/components/ui/TrackingTimeline.jsx
//import { getStatusCfg } from '../../constants'

const STEPS = [
  { status: 'received',            label: 'Réceptionné',   icon: '📦' },
  { status: 'departed_agency',     label: 'Parti agence',  icon: '🏢' },
  { status: 'departed_airport',    label: 'En vol',        icon: '✈️'  },
  { status: 'arrived_destination', label: 'Arrivé dest.',  icon: '📍' },
  { status: 'collected',           label: 'Retiré',        icon: '✅' },
]

function fmt(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function TrackingTimeline({ events = [], currentStatus }) {
  const evMap    = events.reduce((a, e) => ({ ...a, [e.status]: e }), {})
  const curStep  = STEPS.findIndex(s => s.status === currentStatus)
  const isIssue  = currentStatus === 'issue'

  return (
    <div className="flex flex-col">
      {STEPS.map((step, i) => {
        const done    = i < curStep || step.status === currentStatus
        const active  = step.status === currentStatus && !isIssue
        const pending = i > curStep
        const ev      = evMap[step.status]
        const isLast  = i === STEPS.length - 1

        return (
          <div key={step.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center
                              justify-center text-sm flex-shrink-0
                              transition-all ${
                done && !active  ? 'bg-violet-600 text-white'
                : active         ? 'bg-[#0A1628] text-white ring-4 ring-violet-200'
                : 'bg-slate-100 text-slate-400'
              }`}>
                {done && !active ? '✓' : step.icon}
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 my-1 min-h-[20px] ${
                  done ? 'bg-violet-600' : 'bg-slate-100'
                }`}/>
              )}
            </div>
            <div className="pb-4 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className={`text-sm font-semibold ${
                  pending ? 'text-slate-300' : 'text-slate-800'
                }`}>{step.label}</p>
                {ev && <span className="text-[10px] text-slate-400">{fmt(ev.occurredAt)}</span>}
              </div>
              {ev?.agent && (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  par {ev.agent.name}
                  {ev.notes ? ` · ${ev.notes}` : ''}
                </p>
              )}
            </div>
          </div>
        )
      })}

      {isIssue && (
        <div className="mt-2 flex gap-3 bg-red-50 border border-red-100
                        rounded-xl p-3">
          <span className="text-red-500 text-lg">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-700">Problème signalé</p>
            {evMap['issue']?.notes && (
              <p className="text-xs text-red-500 mt-0.5">{evMap['issue'].notes}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}