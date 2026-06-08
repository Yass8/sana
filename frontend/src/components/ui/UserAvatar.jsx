const COLORS = ['#7C3AED','#059669','#2563EB','#D97706','#DC2626']
const colorFor = (id) => COLORS[id?.charCodeAt(0) % COLORS.length] ?? '#7C3AED'
const initials = (name) => name?.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() ?? '?'

export default function UserAvatar({ id, name, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-[10px]' : 'w-10 h-10 text-xs'
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ background: colorFor(id), fontFamily: 'var(--font-display)' }}
    >
      {initials(name)}
    </div>
  )
}