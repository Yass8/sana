// src/hooks/useShipments.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { shipmentsApi } from '../api/shipments.api'

export function useShipments(filters = {}) {
  return useQuery({
    queryKey: ['shipments', filters],
    queryFn:  () => shipmentsApi.getAll(filters),
    select:   (d) => Array.isArray(d) ? d : (d?.rows ?? []),
  })
}

export function useCreateShipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => shipmentsApi.create(data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['shipments'] }),
  })
}