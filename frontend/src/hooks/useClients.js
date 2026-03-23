// src/hooks/useClients.js
import { useQuery, useMutation } from '@tanstack/react-query'
import { usersApi } from '../api/users.api'

export function useClients(search = '') {
  return useQuery({
    queryKey: ['clients', search],
    queryFn:  () => usersApi.getAll({ role: 'client', search: search || undefined }),
    select:   (d) => Array.isArray(d) ? d : (d?.rows ?? []),
  })
}

export function useSendBulkMessage() {
  return useMutation({
    mutationFn: (data) => usersApi.sendBulk(data),
  })
}