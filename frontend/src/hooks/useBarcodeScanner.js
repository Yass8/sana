// src/hooks/useBarcodeScanner.js
import { useEffect, useRef, useCallback, useState } from 'react'
//import { BrowserMultiFormatReader, BrowserBarcodeReader } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'

// Son de bip au scan réussi
function playBeep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 1800
    osc.type            = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.15)
  } catch {
    // Audio non supporté — pas grave
  }
}

export function useBarcodeScanner({ onDetected, enabled = true }) {
  const videoRef    = useRef(null)
  const readerRef   = useRef(null)
  const controlsRef = useRef(null)
  const lastCode    = useRef(null)      // anti-doublon
  const lastTime    = useRef(0)         // timestamp dernier scan

  const [error,   setError]   = useState(null)
  const [isReady, setIsReady] = useState(false)
  const [cameras, setCameras] = useState([])
  const [cameraIdx, setCameraIdx] = useState(0)

  const start = useCallback(async (deviceId = null) => {
    if (!videoRef.current || !enabled) return
    setError(null)

    try {
      readerRef.current = new BrowserMultiFormatReader()

      const devices = await BrowserMultiFormatReader.listVideoInputDevices()
      setCameras(devices)

      if (devices.length === 0) {
        setError('Aucune caméra détectée.')
        return
      }

      // Priorité : caméra arrière sur mobile
      const selectedDevice = deviceId
        ? devices.find(d => d.deviceId === deviceId)
        : devices.find(d =>
            d.label.toLowerCase().includes('back')   ||
            d.label.toLowerCase().includes('arrière') ||
            d.label.toLowerCase().includes('environment')
          ) ?? devices[0]

      controlsRef.current = await readerRef.current.decodeFromVideoDevice(
        selectedDevice?.deviceId,
        videoRef.current,
        (result, err) => {
          if (result) {
            const code = result.getText()
            const now  = Date.now()

            // Anti-doublon : ignore le même code dans les 2 secondes
            if (code === lastCode.current && now - lastTime.current < 2000) return

            lastCode.current = code
            lastTime.current = now

            playBeep()
            navigator.vibrate?.(100)
            onDetected(code)
          }

          if (err && !(err instanceof NotFoundException)) {
            console.warn('Scan error:', err.message)
          }
        }
      )

      setIsReady(true)
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError("Accès caméra refusé. Active l'autorisation dans ton navigateur.")
      } else if (err.name === 'NotFoundError') {
        setError('Aucune caméra disponible.')
      } else if (err.name === 'NotReadableError') {
        setError('Caméra déjà utilisée par une autre application.')
      } else {
        setError(`Erreur caméra : ${err.message}`)
      }
    }
  }, [onDetected, enabled])

  const stop = useCallback(() => {
    controlsRef.current?.stop()
    setIsReady(false)
  }, [])

  // Change de caméra (utile si plusieurs caméras)
  const switchCamera = useCallback(() => {
    if (cameras.length <= 1) return
    stop()
    const next = (cameraIdx + 1) % cameras.length
    setCameraIdx(next)
    start(cameras[next].deviceId)
  }, [cameras, cameraIdx, start, stop])

  useEffect(() => {
    if (enabled) start()
    return () => stop()
  }, [enabled])

  return { videoRef, isReady, error, cameras, switchCamera, restart: start }
}