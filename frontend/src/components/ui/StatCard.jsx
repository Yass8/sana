// src/components/ui/StatCard.jsx
export default function StatCard({ label, value, sub, variant = 'light' }) {
  const variants = {
    light:  'bg-white border border-slate-100',
    dark:   'bg-[#0F1923] border border-[#0F1923]',
    accent: 'bg-[#E8673C] border border-[#E8673C]',
    green:  'bg-white border border-slate-100',
  }
  const numColor = {
    light:  'text-[#0F1923]',
    dark:   'text-[#F0EDE8]',
    accent: 'text-white',
    green:  'text-emerald-500',
  }
  const lblColor = {
    light:  'text-slate-400',
    dark:   'text-white/40',
    accent: 'text-white/70',
    green:  'text-slate-400',
  }

  return (
    <div className={`rounded-xl p-5 flex flex-col gap-1 ${variants[variant]}`}>
      <span style={{fontFamily:'var(--font-display)'}}
            className={`text-3xl font-bold tabular-nums ${numColor[variant]}`}>
        {value ?? '—'}
      </span>
      <span className={`text-xs ${lblColor[variant]}`}>{label}</span>
      {sub && (
        <span className="text-[11px] text-emerald-500 font-medium mt-1">
          {sub}
        </span>
      )}
    </div>
  )
}