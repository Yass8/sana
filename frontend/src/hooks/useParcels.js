// src/hooks/useParcels.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { parcelsApi } from '../api/parcels.api'

export function useParcels(filters = {}) {
  return useQuery({
    queryKey: ['parcels', filters],
    queryFn:  () => parcelsApi.getAll(filters),
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
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => parcelsApi.updateStatus(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] })
      queryClient.invalidateQueries({ queryKey: ['parcel', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}