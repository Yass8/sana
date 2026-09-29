import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoicesApi } from '../api/invoices.api'

export function useInvoices(filters = {}) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => invoicesApi.getAll(filters),
    select: (d) => Array.isArray(d) ? d : (d?.rows ?? []),
    keepPreviousData: true,
  })
}

export function useInvoice(id) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => invoicesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

export function useUpdateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => invoicesApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['invoice', id] })
    },
  })
}

export function useDeleteInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => invoicesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

export function useSendInvoiceEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => invoicesApi.sendEmail(id, data),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['invoice', id] }),
  })
}

export function useAvailableParcelsForInvoice(filters = {}) {
  return useQuery({
    queryKey: ['available-parcels-invoice', filters],
    queryFn: () => invoicesApi.getAvailableParcels(filters),
    select: (d) => Array.isArray(d) ? d : (d?.rows ?? []),
    keepPreviousData: true,
  })
}