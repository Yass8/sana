// src/components/ui/Card.jsx
export default function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-100
                  shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md hover:border-violet-200 transition-all' : ''}
                  ${className}`}
    >
      {children}
    </div>
  )
}