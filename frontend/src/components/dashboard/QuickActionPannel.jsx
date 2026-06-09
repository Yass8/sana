import { useNavigate } from 'react-router-dom';
import { Package, Briefcase, ArrowRight, CheckCircle } from 'lucide-react';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';
import StatusBadge from '../ui/StatusBadge';

export default function QuickActionsPanel({ actions = [], isLoading }) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <div className="p-5 flex justify-center py-8">
          <Spinner />
        </div>
      </Card>
    );
  }

  if (!actions || actions.length === 0) {
    return (
      <Card>
        <div className="p-5 text-center py-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle size={24} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">Tout est à jour</p>
              <p className="text-xs text-slate-400 mt-1">Aucune action immédiate requise.</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: 'var(--font-display)' }} className="font-bold text-slate-900 flex items-center gap-2">
            Actions rapides
            <span className="text-xs font-normal bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {actions.length}
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {actions.map((action, idx) => (
            <ActionCard key={idx} action={action} onClick={() => navigate(action.targetUrl)} />
          ))}
        </div>
      </div>
    </Card>
  );
}

function ActionCard({ action, onClick }) {
  const isBag = action.type === 'bag';
  const Icon = isBag ? Briefcase : Package;
  const bgColor = isBag ? 'bg-violet-50 border-violet-200' : 'bg-blue-50 border-blue-200';
  const iconBg = isBag ? 'bg-violet-200 text-violet-600' : 'bg-blue-200 text-blue-600';
  const codeColor = isBag ? 'text-violet-800' : 'text-blue-800';

  return (
    <div
      className={`${bgColor} border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow group`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p style={{ fontFamily: 'var(--font-display)' }} className={`text-sm font-bold ${codeColor} truncate`}>
              {action.code}
            </p>
            {action.status && (
              <StatusBadge status={action.status} />
            )}
          </div>
          <p className="text-xs text-slate-700 mt-1 line-clamp-2">{action.label}</p>
          <div className="flex items-center gap-1 mt-2 text-xs font-medium text-slate-500 group-hover:text-slate-700">
            <span>Accéder</span>
            <ArrowRight size={12} />
          </div>
        </div>
      </div>
    </div>
  );
}