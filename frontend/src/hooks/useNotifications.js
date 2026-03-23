// src/hooks/useNotifications.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '../api/notifications.api'

export function useNotifications(filters = {}) {
  return useQuery({
    queryKey: ['notifications', filters],
    queryFn:  () => notificationsApi.getAll(filters),
    select:   (d) => Array.isArray(d) ? d : [],
    refetchInterval: 15_000,
  })
}

export function useNotificationStats() {
  return useQuery({
    queryKey: ['notif-stats'],
    queryFn:  notificationsApi.getStats,
    refetchInterval: 15_000,
  })
}

export function useRetryNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => notificationsApi.retry(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notif-stats'] })
    },
  })
}