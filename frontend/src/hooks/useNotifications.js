// src/hooks/useNotifications.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '../api/notifications.api'

export function useNotifications(filters = {}) {
  return useQuery({
    queryKey: ['notifications', filters],
    queryFn:  () => notificationsApi.getAll(filters),
    keepPreviousData: true,
    refetchInterval: 15_000, // actualise toutes les 15s — les pending peuvent changer
  })
}

export function useNotificationStats() {
  return useQuery({
    queryKey: ['notification-stats'],
    queryFn:  notificationsApi.getStats,
    refetchInterval: 15_000,
  })
}

export function useRetryNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => notificationsApi.retry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] })
    },
  })
}