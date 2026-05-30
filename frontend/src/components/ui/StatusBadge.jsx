import { getStatusConfig } from '../../constants/statusConfig'

function formatStatusDate(dateString) {
  if (!dateString) return null
  const date = new Date(dateString)
  const now = new Date()

  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  const time = `${h}h${m}`

  if (isToday) return `Aujourd'hui à ${time}`
  if (isYesterday) return `Hier à ${time}`

  const day = date.getDate()
  const month = date.toLocaleDateString('fr-FR', { month: 'short' })
  return `${day} ${month} à ${time}`
}

export default function StatusBadge({ status, size = 'sm', updatedAt }) {
  const cfg = getStatusConfig(status)
  const px = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
  const dateText = formatStatusDate(updatedAt)

  const badge = (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full ${cfg.bg} ${cfg.text} ${px}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )

  if (!dateText) return badge

  return (
    <div className="flex flex-col items-end gap-0.5">
      {badge}
      <span className="text-[10px] text-slate-400 font-medium leading-none">
        {dateText}
      </span>
    </div>
  )
}