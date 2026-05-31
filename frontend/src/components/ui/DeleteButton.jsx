// src/components/ui/DeleteButton.jsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { bagsApi } from '../../api/bags.api'
import { parcelsApi } from '../../api/parcels.api'
import { confirmDeleteAlert, showSuccessAlert, showErrorAlert } from './SweetsAlert'

export default function DeleteButton({ type, id, onSuccess, className = '' }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const api = type === 'bag' ? bagsApi : parcelsApi
  const itemLabel = type === 'bag' ? 'sac' : 'colis'
  const listRoute = type === 'bag' ? '/bags' : '/parcels'
  const queryKey = type === 'bag' ? 'bags' : 'parcels'

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(id),
    onSuccess: async () => {
      await showSuccessAlert({
        text: `${itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)} supprimé avec succès.`
      })
      queryClient.invalidateQueries({ queryKey: [queryKey] })
      if (onSuccess) {
        onSuccess()
      } else {
        navigate(listRoute)
      }
    },
    onError: async (err) => {
      await showErrorAlert({
        text: err?.message || `Impossible de supprimer le ${itemLabel}.`
      })
    },
  })

  const handleDelete = async () => {
    const confirmed = await confirmDeleteAlert({
      message: `Voulez-vous vraiment supprimer ce ${itemLabel} ? Cette action est irréversible.`,
      confirmButtonText: 'Supprimer',
    })
    if (!confirmed) return
    deleteMutation.mutate()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleteMutation.isPending}
      className={`text-xs bg-slate-50 border-2 border-slate-200
                 hover:border-red-500 hover:text-red-600
                 text-slate-500 px-3 py-1.5 rounded-xl
                 transition-all font-semibold flex items-center gap-1
                 disabled:opacity-50 ${className}`}
    >
      <Trash2 size={14} />
      {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
    </button>
  )
}