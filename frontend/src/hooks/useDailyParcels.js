// src/hooks/useDailyParcels.js
import { useQuery } from '@tanstack/react-query';
import { parcelsApi } from '../api/parcels.api';

export function useDailyParcels(date) {
  return useQuery({
    queryKey: ['daily-parcels', date],
    queryFn: () => parcelsApi.getDailyHistory({ date }),
    enabled: !!date,
    select: (data) => data.parcels ?? [],
  });
}