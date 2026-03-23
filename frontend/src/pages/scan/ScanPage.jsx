// src/pages/scan/ScanPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate }           from 'react-router-dom'
import { BrowserMultiFormatReader } from '@zxing/library'
import { useAuth }               from '../../context/AuthContext'
import { useUpdateParcelStatus } from '../../hooks/useParcels'
import { parcelsApi }            from '../../api/parcels.api'
import StatusBadge               from '../../components/ui/StatusBadge'
import Spinner                   from '../../components/ui/Spinner'
import Card                      from '../../components/ui/Card'

const NEXT_STATUS = {
  agent_fr: {
    received:        'departed_agency',
    departed_agency: 'departed_airport',
  },
  agent_af: {
    departed_airport:    'arrived_destination',
    arrived_destination: 'collected',
  },
  admin: {
    received:            'departed_agency',
    departed_agency:     'departed_airport',
    departed_airport:    'arrived_destination',
    arrived_destination: 'collected',
  },
}

const NEXT_LABEL = {
  departed_agency:     'Confirmer départ agence',
  departed_airport:    'Confirmer embarquement',
  arrived_destination: 'Confirmer arrivée',
  collected:           'Confirmer retrait',
}

const STATE = {
  SCANNING: 'scanning',
  LOADING:  'loading',
  CONFIRM:  'confirm',
  SUCCESS:  'success',
  ERROR:    'error',
}

function playBeep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)()
    const osc  = ctx.createOscillator()
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
  const { user }      = useAuth()
  const navigate      = useNavigate()
  const updateStatus  = useUpdateParcelStatus()

  // ── États de la page ───────────────────────────────
  const [pageState, setPageState] = useState(STATE.SCANNING)
  const [parcel,    setParcel]    = useState(null)
  const [notes,     setNotes]     = useState('')
  const [errorMsg,  setErrorMsg]  = useState('')
  const [manual,    setManual]    = useState('')

  // ── Refs scanner (même logique que le code qui marche) ─
  const readerRef      = useRef(null)
  const videoDeviceRef = useRef(null)
  const lastCodeRef    = useRef(null)
  const lastTimeRef    = useRef(0)
  const scanningRef    = useRef(true) // contrôle si on accepte les scans

  // ── Init caméra ────────────────────────────────────
  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    async function init() {
      try {
        const devices = await reader.listVideoInputDevices()
        if (devices.length > 0) {
          // Préfère la caméra arrière sur mobile
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

  // ── Démarrage du scan ─────────────────────────────
  function startScanning(reader, device) {
    reader.decodeFromVideoDevice(
      device.deviceId,
      'scan-video',
      (result, err) => {
        if (result && scanningRef.current) {
          const text = result.getText()
          const now  = Date.now()

          // Anti-doublon — ignore le même code dans les 2 secondes
          if (text === lastCodeRef.current && now - lastTimeRef.current < 2000) return
          lastCodeRef.current = text
          lastTimeRef.current = now

          // Extrait le code depuis URL si c'est un lien de suivi
          let code = text
          const m  = text.match(/\/track\/([A-Z]+-\d{4}-\d+)/)
          if (m) code = m[1]

          playBeep()
          navigator.vibrate?.(100)
          handleDetected(code)
        }
      }
    ).catch(err => console.error('Erreur décodage:', err))
  }

  // ── Quand un QR est détecté ────────────────────────
  async function handleDetected(code) {
    scanningRef.current = false // pause le scan
    setPageState(STATE.LOADING)

    try {
      const data = await parcelsApi.getByBarcode(code)
      const next = NEXT_STATUS[user.role]?.[data.status]

      if (!next) {
        setErrorMsg(
          data.status === 'collected'
            ? 'Ce colis a déjà été retiré.'
            : `Votre rôle ne peut pas traiter ce colis à l'étape "${data.status}".`
        )
        setPageState(STATE.ERROR)
        return
      }

      setParcel({ ...data, nextStatus: next })
      setPageState(STATE.CONFIRM)
    } catch {
      setErrorMsg('Colis introuvable pour ce code.')
      setPageState(STATE.ERROR)
    }
  }

  // ── Confirme la mise à jour ────────────────────────
  async function handleConfirm() {
    try {
      await updateStatus.mutateAsync({
        id:     parcel.id,
        status: parcel.nextStatus,
        notes:  notes || undefined,
      })
      setPageState(STATE.SUCCESS)
    } catch (err) {
      setErrorMsg(err?.message ?? 'Erreur lors de la mise à jour.')
      setPageState(STATE.ERROR)
    }
  }

  // ── Réinitialise pour un nouveau scan ─────────────
  function reset() {
    setParcel(null)
    setNotes('')
    setErrorMsg('')
    setManual('')
    scanningRef.current = true  // reprend le scan
    setPageState(STATE.SCANNING)
  }

  // ── Saisie manuelle ───────────────────────────────
  function handleManual() {
    if (!manual.trim()) return
    handleDetected(manual.trim().toUpperCase())
  }

  // ─────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto animate-fadeIn">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 style={{fontFamily:'var(--font-display)'}}
              className="text-xl font-bold text-slate-900">
            Scanner un colis
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

      {/* ── Vidéo — toujours dans le DOM ─────────────
          On garde la vidéo montée en permanence pour ne pas
          réinitialiser la caméra à chaque changement d'état */}
      <div className={pageState === STATE.SCANNING || pageState === STATE.LOADING
                       ? 'block' : 'hidden'}>

        {/* Viewfinder */}
        <div className="relative rounded-2xl overflow-hidden bg-[#0A1628] mb-3"
             style={{ height: 300 }}>
          <video
            id="scan-video"
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
          />
          {/* Cadre de visée */}
          <div className="absolute inset-0 flex items-center
                          justify-center pointer-events-none">
            <div className="relative w-52 h-52">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4
                              border-l-4 border-violet-400 rounded-tl-xl"/>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4
                              border-r-4 border-violet-400 rounded-tr-xl"/>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4
                              border-l-4 border-violet-400 rounded-bl-xl"/>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4
                              border-r-4 border-violet-400 rounded-br-xl"/>
            </div>
            <p className="absolute bottom-3 text-white/60 text-xs
                          bg-black/30 px-3 py-1 rounded-full">
              Pointez vers un QR code
            </p>
          </div>
        </div>

        {/* Indicateur */}
        {pageState === STATE.SCANNING && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"/>
            <span className="text-xs text-slate-500">Scanner actif</span>
          </div>
        )}

        {/* Chargement après scan */}
        {pageState === STATE.LOADING && (
          <div className="flex items-center gap-3 bg-slate-50 border
                          border-slate-200 rounded-xl px-4 py-3 mb-3">
            <Spinner size="sm"/>
            <span className="text-sm text-slate-500">Recherche du colis…</span>
          </div>
        )}

        {/* Saisie manuelle */}
        <div className="flex gap-2">
          <input
            type="text"
            value={manual}
            onChange={e => setManual(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleManual()}
            placeholder="Saisie manuelle — COL-2026-…"
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

      {/* ── CONFIRM ───────────────────────────────── */}
      {pageState === STATE.CONFIRM && parcel && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <Card>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p style={{fontFamily:'var(--font-display)'}}
                     className="text-xl font-bold text-violet-600">
                    {parcel.barcode}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {parcel.weight ? `${parcel.weight} kg` : 'Poids non renseigné'}
                  </p>
                </div>
                <StatusBadge status={parcel.status}/>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Expéditeur',   value: parcel.sender?.name },
                  { label: 'Destinataire', value: parcel.recipientName },
                  { label: 'Téléphone',    value: parcel.recipientPhone ?? '—' },
                  { label: 'Sac',          value: parcel.bag?.barcode ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                      {label}
                    </p>
                    <p className="text-sm text-slate-800 font-semibold mt-0.5">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="bg-violet-50 border border-violet-200
                          rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500 mb-1.5">Prochaine étape</p>
            <StatusBadge status={parcel.nextStatus} size="md"/>
          </div>

          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes optionnelles…"
            rows={2}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl
                       text-sm outline-none resize-none transition-all
                       focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          />

          <div className="flex gap-3">
            <button onClick={reset}
                    className="flex-1 border-2 border-slate-200 text-slate-500
                               py-3 rounded-xl text-sm font-semibold
                               hover:border-slate-300 transition-colors">
              Annuler
            </button>
            <button onClick={handleConfirm} disabled={updateStatus.isPending}
                    className="flex-1 bg-violet-600 hover:bg-violet-700
                               disabled:opacity-60 text-white font-semibold
                               py-3 rounded-xl text-sm transition-colors
                               flex items-center justify-center gap-2">
              {updateStatus.isPending
                ? <><Spinner size="sm" color="white"/> Mise à jour…</>
                : NEXT_LABEL[parcel.nextStatus]}
            </button>
          </div>
        </div>
      )}

      {/* ── SUCCESS ───────────────────────────────── */}
      {pageState === STATE.SUCCESS && parcel && (
        <div className="flex flex-col items-center gap-5 py-10 animate-fadeIn">
          <div className="w-16 h-16 bg-emerald-100 rounded-full
                          flex items-center justify-center text-3xl">
            ✅
          </div>
          <div className="text-center">
            <p style={{fontFamily:'var(--font-display)'}}
               className="text-xl font-bold text-slate-900 mb-1">
              Statut mis à jour !
            </p>
            <p className="text-sm text-slate-400">
              {parcel.barcode} →{' '}
              <span className="text-slate-700 font-semibold">
                {NEXT_LABEL[parcel.nextStatus]}
              </span>
            </p>
            <p className="text-xs text-slate-300 mt-1">
              Notification envoyée au client.
            </p>
          </div>
          <div className="flex gap-3 w-full max-w-xs">
            <button onClick={() => navigate(`/parcels/${parcel.id}`)}
                    className="flex-1 border-2 border-slate-200 text-slate-600
                               py-3 rounded-xl text-sm font-semibold
                               hover:border-slate-300 transition-colors">
              Voir le colis
            </button>
            <button onClick={reset}
                    className="flex-1 bg-violet-600 hover:bg-violet-700
                               text-white font-semibold py-3 rounded-xl
                               text-sm transition-colors">
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* ── ERROR ─────────────────────────────────── */}
      {pageState === STATE.ERROR && (
        <div className="flex flex-col items-center gap-5 py-10 animate-fadeIn">
          <div className="w-16 h-16 bg-red-100 rounded-full
                          flex items-center justify-center text-3xl">
            ❌
          </div>
          <div className="text-center">
            <p style={{fontFamily:'var(--font-display)'}}
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