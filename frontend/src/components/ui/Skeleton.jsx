export default function Skeleton({ className = '', as = 'div' }) {
  const Tag = as
  return (
    <Tag className={`animate-pulse bg-slate-100 rounded-2xl ${className}`} />
  )
}
