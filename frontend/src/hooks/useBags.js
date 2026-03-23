// src/hooks/useBags.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bagsApi } from '../api/bags.api'

export function useBags(filters = {}) {
  return useQuery({
    queryKey: ['bags', filters],
    queryFn:  () => bagsApi.getAll(filters),
    select:   (d) => Array.isArray(d) ? d : (d?.rows ?? []),
  })
}

export function useCreateBag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => bagsApi.create(data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['bags'] }),
  })
}