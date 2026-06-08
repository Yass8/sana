import { Package, CheckCircle, Truck, AlertTriangle, Clock } from 'lucide-react'

const StatCard = ({ icon: Icon, label, value, color, bg }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg}`}>
      <Icon size={20} className={color} />
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
    </div>
  </div>
)

export default function UserStatsCards({ stats }) {
  const {
    totalParcels = 0,
    receivedParcels = 0,
    departedParcels = 0,
    arrivedParcels = 0,
    collectedParcels = 0,
    issueParcels = 0,
  } = stats

  const inTransit = receivedParcels + departedParcels + arrivedParcels
  const noParcels = totalParcels === 0

  if (noParcels) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        Aucun colis envoyé pour le moment.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        icon={Package}
        label="Total colis"
        value={totalParcels}
        color="text-violet-600"
        bg="bg-violet-50"
      />
      <StatCard
        icon={Truck}
        label="En transit"
        value={inTransit}
        color="text-blue-600"
        bg="bg-blue-50"
      />
      <StatCard
        icon={CheckCircle}
        label="Collectés"
        value={collectedParcels}
        color="text-emerald-600"
        bg="bg-emerald-50"
      />
      <StatCard
        icon={AlertTriangle}
        label="Problèmes"
        value={issueParcels}
        color="text-amber-600"
        bg="bg-amber-50"
      />
    </div>
  )
}