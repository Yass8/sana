// src/components/ui/StatusBadge.jsx
import { getStatusCfg } from '../../constants'

export default function StatusBadge({ status, size = 'sm' }) {
  const cfg = getStatusCfg(status)
  const px  = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold
                      rounded-full ${cfg.bg} ${cfg.text} ${px}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>
      {cfg.label}
    </span>
  )
}