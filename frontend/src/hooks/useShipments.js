// src/hooks/useShipments.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { shipmentsApi } from '../api/shipments.api'

export function useShipments(filters = {}) {
  return useQuery({
    queryKey: ['shipments', filters],
    queryFn:  () => shipmentsApi.getAll(filters),
    keepPreviousData: true,
  })
}

export function useCreateShipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => shipmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}