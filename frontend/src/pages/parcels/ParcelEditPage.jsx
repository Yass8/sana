// src/pages/parcels/ParcelEditPage.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { parcelsApi } from '../../api/parcels.api'
import { useBags } from '../../hooks/useBags'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import Skeleton from '../../components/ui/Skeleton'
import { showSuccessAlert, showErrorAlert } from '../../components/ui/SweetsAlert'
import { ArrowLeft, Save } from 'lucide-react'

export default function ParcelEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: parcel, isLoading } = useQuery({
    queryKey: ['parcel', id],
    queryFn: () => parcelsApi.getById(id),
  })

  // Gestion du sac
  const [selectedBagId, setSelectedBagId] = useState('')
  const { data: openBags = [], isLoading: loadingBags } = useBags({ status: 'ouvert' })

  const bagMutation = useMutation({
    mutationFn: (bagId) => parcelsApi.update(id, { bagId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcel', id] })
      queryClient.invalidateQueries({ queryKey: ['parcels'] })
      showSuccessAlert({ text: 'Sac mis à jour avec succès.' })
    },
    onError: (err) => {
      showErrorAlert({ text: err?.message || 'Erreur lors de la modification du sac.' })
    },
  })

  const handleRemoveBag = () => bagMutation.mutate(null)
  const handleAssignBag = () => {
    if (!selectedBagId) {
      showErrorAlert({ text: 'Veuillez sélectionner un sac.' })
      return
    }
    bagMutation.mutate(selectedBagId)
  }

  // Formulaire principal
  const [form, setForm] = useState({
    description: '',
    weight: '',
    recipientName: '',
    recipientPhone: '',
  })

  useEffect(() => {
    if (parcel) {
      setForm({
        description: parcel.description ?? '',
        weight: parcel.weight ?? '',
        recipientName: parcel.recipientName ?? '',
        recipientPhone: parcel.recipientPhone ?? '',
      })
    }
  }, [parcel])

  const updateMutation = useMutation({
    mutationFn: (data) => parcelsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcel', id] })
      queryClient.invalidateQueries({ queryKey: ['parcels'] })
    },
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await updateMutation.mutateAsync({
        ...form,
        weight: form.weight ? parseFloat(form.weight) : null,
      })
      await showSuccessAlert({ text: 'Colis mis à jour avec succès.' })
      navigate(`/parcels/${id}`)
    } catch (err) {
      await showErrorAlert({ text: err?.message || 'Impossible de mettre à jour le colis.' })
    }
  }

  if (isLoading) return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5 animate-fadeIn">
      <Skeleton className="h-5 w-28" />
      <Card>
        <div className="p-5 space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
          <Skeleton className="h-24" />
        </div>
      </Card>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5 animate-fadeIn mb-8 md:mb-25 lg:mb-0">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <button onClick={() => navigate(`/parcels/${id}`)}
                className="hover:text-violet-600 transition-colors flex items-center gap-1">
          <ArrowLeft size={14} /> Détails
        </button>
        <span>/</span>
        <span className="text-violet-600 font-bold">Modifier</span>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <div className="p-5">
            {/* SECTION : Modification du sac */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-slate-600">Sac actuel :</span>
                <span className="text-sm font-semibold text-violet-700">
                  {parcel?.bag?.qrcode ?? 'Aucun'}
                </span>
              </div>
            </div>

            {/* SECTION : Modifier le colis */}
            <h2 style={{ fontFamily: 'var(--font-display)' }}
                className="font-bold text-slate-900 mb-5">Modifier le colis</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                  Code QR
                </label>
                <input value={parcel?.qrcode} disabled
                       className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                  Statut actuel
                </label>
                <input value={parcel?.status} disabled
                       className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                  Expéditeur
                </label>
                <input value={parcel?.sender?.name ?? '—'} disabled
                       className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                  Sac
                </label>
                <input value={parcel?.bag?.qrcode ?? '—'} disabled
                       className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-400 cursor-not-allowed" />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                    Destinataire <span className="text-violet-600">*</span>
                  </label>
                  <input name="recipientName" value={form.recipientName} onChange={handleChange} required
                         className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                    Téléphone destinataire
                  </label>
                  <input name="recipientPhone" value={form.recipientPhone} onChange={handleChange}
                         className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                    Poids (kg)
                  </label>
                  <input name="weight" type="number" step="0.01" value={form.weight} onChange={handleChange}
                         className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                  Description
                </label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={3}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none resize-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => navigate(`/parcels/${id}`)}
                      className="flex-1 border-2 border-slate-200 text-slate-500 py-3 rounded-xl text-sm font-semibold hover:border-slate-300 transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={updateMutation.isPending}
                      className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                {updateMutation.isPending ? <><Spinner size="sm" color="white" /> Enregistrement…</> : <><Save size={16} /> Enregistrer</>}
              </button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  )
}