// src/components/ui/StatusBadge.jsx
import { getStatusConfig } from '../../constants/statusConfig'

export default function StatusBadge({ status }) {
  const cfg = getStatusConfig(status)
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px]
                      font-medium px-2.5 py-1 rounded-full
                      ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}