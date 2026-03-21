// src/components/scan/BarcodeScanner.jsx
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner'

export default function BarcodeScanner({ onDetected, enabled = true }) {
  const { videoRef, isReady, error,
          cameras, switchCamera, restart } = useBarcodeScanner({
    onDetected,
    enabled,
  })

  return (
    <div className="flex flex-col gap-3">

      {/* Viewfinder */}
      <div className="relative w-full aspect-video max-w-md mx-auto
                      rounded-xl overflow-hidden bg-[#0F1923]">

        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
        />

        {/* Overlay visée */}
        {isReady && (
          <div className="absolute inset-0 flex flex-col items-center
                          justify-center pointer-events-none">

            {/* Coins animés */}
            <div className="relative w-56 h-36">
              {[
                'top-0 left-0 border-t-2 border-l-2',
                'top-0 right-0 border-t-2 border-r-2',
                'bottom-0 left-0 border-b-2 border-l-2',
                'bottom-0 right-0 border-b-2 border-r-2',
              ].map((cls, i) => (
                <span key={i}
                      className={`absolute w-6 h-6 border-[#E8673C] ${cls}`}/>
              ))}

              {/* Ligne de scan animée */}
              <div className="absolute left-1 right-1 h-0.5
                              bg-[#E8673C]/80 animate-scan-line"/>
            </div>

            <p className="absolute bottom-3 text-white/60 text-xs
                          bg-black/30 px-3 py-1 rounded-full">
              Placez le code-barres dans le cadre
            </p>
          </div>
        )}

        {/* Chargement */}
        {!isReady && !error && (
          <div className="absolute inset-0 flex flex-col items-center
                          justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#E8673C]
                            border-t-transparent rounded-full animate-spin"/>
            <p className="text-white/50 text-xs">Activation caméra…</p>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center
                          justify-center gap-4 p-6">
            <div className="w-12 h-12 bg-red-500/20 rounded-full
                            flex items-center justify-center">
              <span className="text-red-400 text-xl">!</span>
            </div>
            <p className="text-white/70 text-xs text-center">{error}</p>
            <button
              onClick={restart}
              className="bg-[#E8673C] text-white text-xs px-4 py-2
                         rounded-lg hover:bg-[#D45A30] transition-colors"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Bouton changer de caméra */}
        {isReady && cameras.length > 1 && (
          <button
            onClick={switchCamera}
            className="absolute top-2 right-2 bg-black/40 text-white
                       text-xs px-2 py-1 rounded-lg hover:bg-black/60
                       transition-colors"
          >
            Changer caméra
          </button>
        )}

      </div>

      {/* Indicateur actif */}
      {isReady && (
        <div className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full
                           animate-pulse"/>
          <span className="text-xs text-slate-500">
            Caméra active — en attente d'un code-barres
          </span>
        </div>
      )}

    </div>
  )
}