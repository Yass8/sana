// src/hooks/useSocket.js
import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'

export function useSocket() {
  const queryClient = useQueryClient()
  const socketRef   = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')

    socketRef.current = io('/', {
      auth:  { token },
      transports: ['websocket'],
    })

    const socket = socketRef.current

    // Le backend émet ces events après chaque updateStatus
    socket.on('parcel:updated', ({ parcelId }) => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] })
      queryClient.invalidateQueries({ queryKey: ['parcel', parcelId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    })

    socket.on('connect_error', (err) => {
      console.warn('Socket.io connexion échouée :', err.message)
      // L'app reste fonctionnelle sans le temps réel
    })

    return () => socket.disconnect()
  }, [queryClient])
}