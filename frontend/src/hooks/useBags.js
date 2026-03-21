// src/hooks/useBags.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bagsApi } from '../api/bags.api'

export function useBags(filters = {}) {
  return useQuery({
    queryKey: ['bags', filters],
    queryFn:  () => bagsApi.getAll(filters),
    keepPreviousData: true,
  })
}

export function useCreateBag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => bagsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bags'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}