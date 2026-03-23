// src/hooks/useParcels.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { parcelsApi } from '../api/parcels.api'

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