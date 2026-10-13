// src/hooks/useParcels.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { parcelsApi } from '../api/parcels.api'

// ═══════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════

export function useParcels(filters = {}) {
  return useQuery({
    queryKey: ['parcels', filters],
    queryFn:  () => parcelsApi.getAll(filters),
    select:   (d) => d,
    keepPreviousData: true,
  })
}

export function useParcel(id) {
  return useQuery({
    queryKey: ['parcel', id],
    queryFn:  () => parcelsApi.getById(id),
    enabled:  !!id,
  })
}

export function useAvailableParcels() {
  return useQuery({
    queryKey: ['available-parcels'],
    queryFn: () => parcelsApi.getAll({ status: 'received', bagId: 'null' }),
    select: (d) => (Array.isArray(d) ? d : d?.rows ?? []),
  })
}

// ═══════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════

export function useUpdateParcelStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => parcelsApi.updateStatus(id, data),
    onSuccess:  (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['parcels'] })
      qc.invalidateQueries({ queryKey: ['parcel', id] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

/**
 * Crée un colis ET sa facture en une seule requête transactionnelle.
 *
 * Backend : `POST /parcels/with-invoice`
 * Réponse : { parcel, invoice, warnings?, newClient? }
 *
 * Effets de bord :
 *   • Invalide toutes les queries impactées (parcels, invoices, bags…)
 *   • Pré-remplit les caches [parcel, id] et [invoice, id] pour
 *     éviter un refetch immédiat après navigation
 */
export function useCreateParcelWithInvoice() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data) => parcelsApi.createWithInvoice(data),
    onSuccess: (result) => {
      // Invalider tout ce qui a pu changer suite à la création
      qc.invalidateQueries({ queryKey: ['parcels'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['available-parcels-invoice'] })
      qc.invalidateQueries({ queryKey: ['available-parcels'] })
      qc.invalidateQueries({ queryKey: ['bags'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })

      // Pré-remplir le cache → navigation instantanée sans refetch
      if (result?.parcel?.id) {
        qc.setQueryData(['parcel', result.parcel.id], result.parcel)
      }
      if (result?.invoice?.id) {
        qc.setQueryData(['invoice', result.invoice.id], result.invoice)
      }
    },
  })
}