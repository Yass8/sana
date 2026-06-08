// src/hooks/useDashboardStats.js
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api/dashboard.api'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn:  dashboardApi.getStats,
    refetchInterval: 60_000,
  })
}

export function useQuickActions() {
    return useQuery({
        queryKey: ['quick-actions'],
        queryFn: dashboardApi.getQuickActions,
        staleTime: 30_000,
    refetchInterval: 60_000, // rafraîchir toutes les minutes
    })
}