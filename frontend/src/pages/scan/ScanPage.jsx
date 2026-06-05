// src/pages/scan/ScanPage.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrowserMultiFormatReader } from '@zxing/library'
import { useAuth } from '../../context/AuthContext'
import { parcelsApi } from '../../api/parcels.api'
import { bagsApi } from '../../api/bags.api'
import Spinner from '../../components/ui/Spinner'

const STATE = {
  SCANNING: 'scanning',
  LOADING: 'loading',
  ERROR: 'error',
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 1800
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.15)
  } catch {}
}

export default function ScanPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [pageState, setPageState] = useState(STATE.SCANNING)
  const [errorMsg, setErrorMsg] = useState('')
  const [manual, setManual] = useState('')
  const [debugCode, setDebugCode] = useState('')

  const readerRef = useRef(null)
  const videoDeviceRef = useRef(null)
  const lastCodeRef = useRef(null)
  const lastTimeRef = useRef(0)
  const scanningRef = useRef(true)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    async function init() {
      try {
        const devices = await reader.listVideoInputDevices()
        if (devices.length > 0) {
          const backCam = devices.find(d =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('arrière') ||
            d.label.toLowerCase().includes('environment')
          ) ?? devices[0]
          videoDeviceRef.current = backCam
          startScanning(reader, backCam)
        }
      } catch (err) {
        console.error('Erreur init caméra:', err)
      }
    }

    init()

    return () => {
      reader.reset()
      const video = document.getElementById('scan-video')
      if (video) { video.pause(); video.srcObject = null }
    }
  }, [])

  function startScanning(reader, device) {
    reader.decodeFromVideoDevice(
      device.deviceId,
      'scan-video',
      (result, err) => {
        if (result && scanningRef.current) {
          const text = result.getText()
          const now = Date.now()

          if (text === lastCodeRef.current && now - lastTimeRef.current < 2000) return
          lastCodeRef.current = text
          lastTimeRef.current = now

          playBeep()
          navigator.vibrate?.(100)
          handleDetected(text)
        }
      }
    ).catch(err => console.error('Erreur décodage:', err))
  }

  async function handleDetected(rawText) {
    scanningRef.current = false
    setPageState(STATE.LOADING)

    // Extraction du code
    let code = rawText
    const trackMatch = rawText.match(/\/track\/([A-Z0-9]+)/i)
    const bagMatch = rawText.match(/\/bags\/([A-Z0-9]+)/i)
    if (trackMatch) code = trackMatch[1]
    else if (bagMatch) code = bagMatch[1]

    setDebugCode(code)

    // 1. Recherche colis
    let isParcel = false
    try {
      const data = await parcelsApi.getByQRCode(code)
      // Redirection directe vers la page détail du colis
      navigate(`/parcels/${data.id}`)
      isParcel = true
    } catch (err) {
      // Ignorer, on va tenter de trouver un sac
      // console.log('Pas un colis, recherche sac...')
      console.error('Erreur recherche colis:', err)
    }

    if (isParcel) return

    // 2. Recherche sac
    try {
      const bag = await bagsApi.getByQRCode(code)
      const bagId = bag.id ?? bag.data?.id
      if (bagId) {
        navigate(`/bags/${bagId}`)
        return
      }
      throw new Error('ID sac introuvable')
    } catch (err) {
      console.error('Erreur recherche sac:', err)
      if (err?.response?.status === 404) {
        setErrorMsg(`Colis ou sac introuvable pour le code "${code}".`)
      } else {
        setErrorMsg('Erreur lors de la recherche. Réessayez.')
      }
      setPageState(STATE.ERROR)
    }
  }

  function reset() {
    setErrorMsg('')
    setManual('')
    setDebugCode('')
    scanningRef.current = true
    setPageState(STATE.SCANNING)
  }

  function handleManual() {
    if (!manual.trim()) return
    handleDetected(manual.trim().toUpperCase())
  }

  return (
    <div className="max-w-lg mx-auto animate-fadeIn">

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)' }}
            className="text-xl font-bold text-slate-900">
            Scanner un colis ou un sac
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {user.role === 'agent_fr'
              ? 'Réception → agence → aéroport'
              : user.role === 'agent_af'
                ? 'Aéroport → destination → retrait'
                : 'Toutes les étapes'}
          </p>
        </div>
        {pageState !== STATE.SCANNING && (
          <button onClick={reset}
            className="text-xs text-slate-400 hover:text-violet-600
                       border border-slate-200 hover:border-violet-300
                       px-3 py-1.5 rounded-xl transition-all">
            ← Nouveau scan
          </button>
        )}
      </div>

      {/* Zone de scan */}
      <div className={pageState === STATE.SCANNING || pageState === STATE.LOADING
        ? 'block' : 'hidden'}>

        <div className="relative rounded-2xl overflow-hidden bg-[#0A1628] mb-3"
          style={{ height: 300 }}>
          <video
            id="scan-video"
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
          />
          <div className="absolute inset-0 flex items-center
                          justify-center pointer-events-none">
            <div className="relative w-52 h-52">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4
                              border-l-4 border-violet-400 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4
                              border-r-4 border-violet-400 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4
                              border-l-4 border-violet-400 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4
                              border-r-4 border-violet-400 rounded-br-xl" />
            </div>
            <p className="absolute bottom-3 text-white/60 text-xs
                          bg-black/30 px-3 py-1 rounded-full">
              Pointez vers un QR code
            </p>
          </div>
        </div>

        {/* Affichage du code extrait (debug) */}
        {debugCode && (
          <div className="text-center text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-1 mb-2">
            Dernier code : <span className="font-mono font-bold">{debugCode}</span>
          </div>
        )}

        {pageState === STATE.SCANNING && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-slate-500">Scanner actif</span>
          </div>
        )}

        {pageState === STATE.LOADING && (
          <div className="flex items-center gap-3 bg-slate-50 border
                          border-slate-200 rounded-xl px-4 py-3 mb-3">
            <Spinner size="sm" />
            <span className="text-sm text-slate-500">Recherche en cours…</span>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={manual}
            onChange={e => setManual(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleManual()}
            placeholder="Saisie manuelle — CL12345 ou SA12345"
            className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl
                       text-sm font-mono outline-none transition-all
                       focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          />
          <button
            onClick={handleManual}
            disabled={!manual.trim()}
            className="bg-[#0A1628] disabled:opacity-40 text-white
                       px-5 rounded-xl text-sm font-semibold
                       hover:bg-slate-800 transition-colors"
          >
            OK
          </button>
        </div>
      </div>

      {/* ERROR */}
      {pageState === STATE.ERROR && (
        <div className="flex flex-col items-center gap-5 py-10 animate-fadeIn">
          <div className="w-16 h-16 bg-red-100 rounded-full
                          flex items-center justify-center text-3xl">
            ❌
          </div>
          <div className="text-center">
            <p style={{ fontFamily: 'var(--font-display)' }}
              className="text-xl font-bold text-slate-900 mb-1">
              Impossible de traiter
            </p>
            <p className="text-sm text-slate-400 max-w-xs">{errorMsg}</p>
          </div>
          <button onClick={reset}
            className="bg-violet-600 hover:bg-violet-700 text-white
                       font-semibold px-8 py-3 rounded-xl text-sm
                       transition-colors">
            Réessayer
          </button>
        </div>
      )}

    </div>
  )
}