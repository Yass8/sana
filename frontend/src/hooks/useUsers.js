// src/hooks/useUsers.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../api/users.api'

export function useUsers({ role, search, page = 1, limit = 100 } = {}) {
  return useQuery({
    // page + limit dans la queryKey → cache séparé par page/filtre
    queryKey: ['users', { role, search, page, limit }],
    queryFn: () =>
      usersApi.getAll({
        role,
        search: search || undefined,
        page,
        limit,
      }),
    // Garde la structure paginée, ne l'aplatit plus
    select: (d) => {
      if (Array.isArray(d)) {
        return { rows: d, count: d.length, page: 1, totalPages: 1 }
      }
      return {
        rows: d?.rows ?? [],
        count: d?.count ?? 0,
        page: d?.page ?? 1,
        totalPages: d?.totalPages ?? 1,
      }
    },
    // Conserve la page précédente pendant le fetch de la suivante
    placeholderData: (prev) => prev, // v5
    // keepPreviousData: true,       // v4 — décommente selon ta version
  })
}

export function useUser(id) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  })
}

export function useSendBulkMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => usersApi.sendBulk(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })   // pour rafraîchir si besoin
    },
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => usersApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => usersApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user', id] })
    },
  })
}

export function useDesactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => usersApi.desactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => usersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdatePassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, currentPassword, newPassword }) =>
      usersApi.updatePassword(id, { currentPassword, newPassword }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['user', id] })
    },
  })
}