// src/components/scan/BarcodeScanner.jsx
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner'

export default function BarcodeScanner({ onDetected, enabled = true }) {
  const { videoRef, isReady, error, restart } = useBarcodeScanner({
    onDetected,
    enabled,
  })

  return (
    <div className="relative w-full aspect-video max-w-md mx-auto
                    rounded-xl overflow-hidden bg-[#0F1923]">

      {/* Flux vidéo */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline  // important sur iOS
      />

      {/* Overlay de visée */}
      {isReady && (
        <div className="absolute inset-0 flex items-center justify-center
                        pointer-events-none">
          {/* Cadre de scan animé */}
          <div className="w-56 h-36 relative">
            {/* Coins du cadre */}
            {['top-0 left-0','top-0 right-0','bottom-0 left-0','bottom-0 right-0'].map((pos, i) => (
              <span
                key={i}
                className={`absolute w-6 h-6 border-[#E8673C] ${pos} ${
                  i < 2 ? 'border-t-2' : 'border-b-2'
                } ${
                  i % 2 === 0 ? 'border-l-2' : 'border-r-2'
                }`}
              />
            ))}
            {/* Ligne de scan animée */}
            <div className="absolute left-1 right-1 h-0.5 bg-[#E8673C]/70
                            animate-scan-line" />
          </div>
          <p className="absolute bottom-4 text-white/60 text-xs">
            Placez le code-barres dans le cadre
          </p>
        </div>
      )}

      {/* État chargement caméra */}
      {!isReady && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#E8673C] border-t-transparent
                            rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white/50 text-xs">Activation de la caméra…</p>
          </div>
        </div>
      )}

      {/* Erreur caméra */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <button
              onClick={restart}
              className="bg-[#E8673C] text-white text-xs px-4 py-2
                         rounded-lg hover:bg-[#D45A30] transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}