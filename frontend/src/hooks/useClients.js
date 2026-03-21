// src/hooks/useClients.js
import { useQuery, useMutation } from '@tanstack/react-query'
import { usersApi } from '../api/users.api'

export function useClients(search = '') {
  return useQuery({
    queryKey: ['clients', search],
    queryFn:  () => usersApi.getAll({ role: 'client', search: search || undefined }),
    keepPreviousData: true,
    // Extrait rows directement pour que data soit toujours un tableau
    select: (res) => res?.rows ?? res ?? [],
  })
}

export function useSendBulkMessage() {
  return useMutation({
    mutationFn: ({ userIds, channel, message }) =>
      usersApi.sendBulk({ userIds, channel, message }),
  })
}