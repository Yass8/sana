// src/hooks/useAgencies.js
import { useQuery } from '@tanstack/react-query'
import { agenciesApi } from '../api/agencies.api'

export function useAgencies() {
  return useQuery({
    queryKey: ['agencies'],
    queryFn:  agenciesApi.getAll,
    staleTime: 1000 * 60 * 10, // 10 min — les agences changent rarement
  })
}

export function useAgenciesByCountry() {
  const { data: agencies = [], ...rest } = useAgencies()
  return {
    ...rest,
    agenciesFR: agencies.filter(a => a.country === 'FR'),
    agenciesAF: agencies.filter(a => a.country !== 'FR'),
  }
}