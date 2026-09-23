// labelShared.jsx
// Constantes, helpers, composants et hook partagés par toutes les étiquettes.

import { useEffect, useRef, useState } from 'react'
import { Printer } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// ============================================================================
//  1. CONSTANTES DE MISE EN PAGE
// ============================================================================

export const BASE_API_URL = import.meta.env.VITE_BASE_API_URL

// ---- Format physique 100 × 60 mm ------------------------------------------
export const LABEL_W_MM = 100
export const LABEL_H_MM = 60
export const MM_TO_PX = 3.7795
export const LABEL_W_PX = Math.round(LABEL_W_MM * MM_TO_PX) // ≈ 378 px
export const LABEL_H_PX = Math.round(LABEL_H_MM * MM_TO_PX) // ≈ 227 px

// ---- Polices (Professionnelles pour la logistique) -------------------------
export const FONT = {
  sans: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  mono: '"Courier New", Courier, monospace',
}

// ---- Palette (Strictement Noir & Blanc pour thermique) ---------------------
export const COLOR = {
  ink: '#000000',
  paper: '#ffffff',
}

// ---- Échelle typographique -------------------------------------------------
export const TEXT_STYLES = {
  micro:  { fontSize: '4.5pt', fontWeight: 800, letterSpacing: '0.7px', textTransform: 'uppercase', lineHeight: 1.1 },
  tiny:   { fontSize: '5.5pt', fontWeight: 600, lineHeight: 1.2 },
  small:  { fontSize: '6.5pt', fontWeight: 500, lineHeight: 1.25 },
  body:   { fontSize: '7.5pt', fontWeight: 500, lineHeight: 1.25 },
  strong: { fontSize: '8.5pt', fontWeight: 800, lineHeight: 1.15 },
  name:   { fontSize: '9.5pt', fontWeight: 700, lineHeight: 1.05 },
  mono:   { fontFamily: FONT.mono, fontSize: '7.5pt', fontWeight: 700, letterSpacing: '0.4px', lineHeight: 1.1 },
  monoLg: { fontFamily: FONT.mono, fontSize: '19pt', fontWeight: 700, letterSpacing: '0.5px', lineHeight: 1 },
}

// ============================================================================
//  2. UTILITAIRES
// ============================================================================

export function isValidUrl(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export function resolveUrl(url) {
  if (!url) return ''
  return url.startsWith('http') ? url : `${BASE_API_URL}/${url}`
}

export function formatDate(value) {
  if (!value) return ''
  if (value instanceof Date) return value.toLocaleDateString('fr-FR')
  return String(value)
}

export function waitForImages(root) {
  if (!root) return Promise.resolve()
  const images = Array.from(root.querySelectorAll('img'))
  return Promise.all(
    images.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete && img.naturalWidth > 0) return resolve()
          img.onload = () => resolve()
          img.onerror = () => resolve()
        })
    )
  )
}

export async function captureToPDF(node, filename) {
  if (!node) return
  await waitForImages(node)

  const canvas = await html2canvas(node, {
    scale: 3,
    useCORS: true,
    width: LABEL_W_PX,
    height: LABEL_H_PX,
    logging: false,
    backgroundColor: '#ffffff',
  })

  const pdf = new jsPDF({
    unit: 'mm',
    format: [LABEL_W_MM, LABEL_H_MM],
    orientation: 'landscape',
  })
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, LABEL_W_MM, LABEL_H_MM)
  pdf.save(filename)
}

// ============================================================================
//  3. HOOK D'EXPORT
// ============================================================================

export function useLabelExport(defaultFilename) {
  const [pending, setPending] = useState(false)
  const labelRef = useRef(null)
  const filenameRef = useRef(defaultFilename)

  useEffect(() => {
    if (!pending) return
    let alive = true

    const run = async () => {
      try {
        await captureToPDF(labelRef.current, filenameRef.current)
      } finally {
        if (alive) setPending(false)
      }
    }
    run()

    return () => {
      alive = false
    }
  }, [pending])

  const exportLabel = (filename) => {
    filenameRef.current = filename || defaultFilename
    setPending(true)
  }

  return { pending, labelRef, exportLabel }
}

// ============================================================================
//  4. COMPOSANTS RÉUTILISABLES
// ============================================================================

export function Text({ variant = 'body', style, children }) {
  return <div style={{ ...TEXT_STYLES[variant], ...style }}>{children}</div>
}

export function PrintButton({ onClick, disabled, tooltip, className = '', label = 'Télécharger étiquette' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-60 bg-[#7C3AED] hover:bg-[#5B21B6] ${className}`}
    >
      <Printer size={16} />
      {label}
    </button>
  )
}

export function LabelSheet({ active, innerRef, children }) {
  if (!active) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        transform: 'translate(-200vw, -200vh)',
        width: `${LABEL_W_PX}px`,
        height: `${LABEL_H_PX}px`,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    >
      <div
        ref={innerRef}
        style={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          background: COLOR.paper,
          color: COLOR.ink,
          fontFamily: FONT.sans,
          overflow: 'hidden',
          border: '1px solid #000', 
        }}
      >
        {children}
      </div>
    </div>
  )
}

export function BrandHeader({ logoUrl, right }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '3mm',
        padding: '2mm 3mm',
        background: COLOR.paper, 
        color: COLOR.ink,
        flexShrink: 0,
        borderBottom: `0.4mm solid ${COLOR.ink}`, 
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '2mm', minWidth: 0 }}>
        <div
          style={{
            width: '9mm',
            height: '8mm',
            background: COLOR.paper,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.5mm',
            // boxSizing: 'border-box',
            flexShrink: 0,
            // border: `0.2mm solid ${COLOR.ink}`,
            // borderRadius: '50%',
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="logo"
              crossOrigin="anonymous"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', borderRadius: '10%' }}
            />
          ) : (
            <span style={{ color: COLOR.ink, fontSize: '5pt', fontWeight: 900, letterSpacing: '0.2px' }}>
              LOGO
            </span>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '9pt', fontWeight: 900, lineHeight: 1, whiteSpace: 'nowrap' }}>
            LA POSTE COMORES
          </div>
          <div style={{ fontSize: '4.5pt', fontWeight: 700, letterSpacing: '0.6px', marginTop: '0.7mm', whiteSpace: 'nowrap' }}>
            MORONI PORT · TÉL: 773 43 43 / 326 85 86
          </div>
        </div>
      </div>

      {right}
    </div>
  )
}

export function Field({ label, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6mm', minWidth: 0, ...style }}>
      {label && <Text variant="micro" style={{ fontSize: '5.5pt', textDecoration: 'underline' }}>{label}</Text>}
      {children}
    </div>
  )
}

export function Rule({ spacing = '2mm', dashed = false }) {
  return (
    <div
      style={{
        height: 0,
        margin: `${spacing} 0`,
        borderTop: `0.2mm ${dashed ? 'dashed' : 'solid'} ${COLOR.ink}`,
        flexShrink: 0,
      }}
    />
  )
}

export function CheckBox({ checked, size = '3mm', fontSize = '6pt' }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        border: `0.2mm solid ${COLOR.ink}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 900,
        lineHeight: 0,
        flexShrink: 0,
        color: COLOR.ink,
        verticalAlign: 'middle',
        paddingBottom: '10px',
      }}
    >
      {checked ? 'X' : ''}
    </span>
  )
}

export function CheckItem({ checked, label, size, fontSize }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '1mm',
        fontSize: '7pt',
        fontWeight: 800,
        letterSpacing: '0.3px',
        whiteSpace: 'nowrap',
        verticalAlign: 'middle',
      }}
    >
      <CheckBox checked={checked} size={size} fontSize={fontSize} />
      <strong style={{ paddingBottom: '10px', }}>{label}</strong>
    </span>
  )
}

export function MetaCell({ label, value, style }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: '0.9mm 1.5mm',
        border: `0.2mm solid ${COLOR.ink}`,
        ...style,
      }}
    >
      <Text variant="micro" style={{ fontSize: '4pt' }}>
        {label}
      </Text>
      <Text variant="strong" style={{ fontSize: '7.5pt', marginTop: '0.4mm', whiteSpace: 'nowrap' }}>
        {value || '—'}
      </Text>
    </div>
  )
}

/** Image QR, toujours cadrée dans un carré, sans bordure . */

export function QrBlock({ src, size = '24mm', style, framed = false }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: COLOR.paper,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        
        ...style,
      }}
    >
      <img
        src={src}
        alt=""
        crossOrigin="anonymous"
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    </div>
  )
}

export function Badge({ children, inverted = false }) {
  return (
    <div
      style={{
        background: inverted ? COLOR.ink : COLOR.paper,
        color: inverted ? COLOR.paper : COLOR.ink,
        fontSize: '7pt',
        fontWeight: 900,
        letterSpacing: '1px',
        textTransform: 'uppercase',
        padding: '0.9mm 2mm',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        border: `0.2mm solid ${COLOR.ink}`, // Bordure noire pour le style thermique
      }}
    >
      {children}
    </div>
  )
}

/**
 * Pied d'étiquette : filet + ligne d'informations secondaires.
 */
export function FooterStrip({ children }) {
  return (
    <div
      style={{
        borderTop: `0.4mm solid ${COLOR.ink}`,
        padding: '2mm 1mm',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '2mm',
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  )
}