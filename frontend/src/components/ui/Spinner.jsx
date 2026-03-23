// src/components/ui/Spinner.jsx
export default function Spinner({ size = 'md', color = 'violet' }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'
  const c = color === 'white' ? 'border-white' : 'border-violet-600'
  return (
    <div className={`${s} border-2 ${c} border-t-transparent
                     rounded-full animate-spin`}/>
  )
}