// BagLabelPrinter.jsx
import {
  BrandHeader,
  Field,
  FooterStrip,
  LabelSheet,
  PrintButton,
  QrBlock,
  Rule,
  Text,
  formatDate,
  isValidUrl,
  resolveUrl,
  useLabelExport,
} from './LabelShared'

export function BagLabelPrinter({
  code = '',
  qrcodeUrl = '',
  recipientInfo = 'LA POSTE, MORONI PORT',
  logoUrl = '/lapostelogo.png',
  disabled = false,
  className = '',
  parcelCount = '',
  weight = '',
  date = '',
  senderName = 'SANA SERVICE',
  senderPhone = '+33 07 59 01 33 76',
}) {
  const { pending, labelRef, exportLabel } = useLabelExport('etiquette-sac.pdf')

  const resolvedQr = resolveUrl(qrcodeUrl)
  const isDisabled = disabled || !isValidUrl(qrcodeUrl) || pending
  const tooltip = isDisabled
    ? 'QR code manquant ou invalide. Impossible d’imprimer.'
    : 'Télécharger l’étiquette'

  const displayCode = code
  const displayDate = formatDate(date)

  const handlePrint = () => {
    if (isDisabled) return
    exportLabel(`etiquette-sac-${displayCode || 'qr'}.pdf`)
  }

  return (
    <>
      <PrintButton onClick={handlePrint} disabled={isDisabled} tooltip={tooltip} className={className} />

      <LabelSheet active={pending} innerRef={labelRef}>
        {/* ---------- EN-TÊTE ---------- */}
        <BrandHeader 
          logoUrl={logoUrl} 
          right={
            <div style={{ textAlign: 'right', lineHeight: 1.1 }}>
              <Text variant="micro" style={{ fontSize: '4.5pt', textTransform: 'uppercase' }}>
                TYPE
              </Text>
              <Text variant="strong" style={{ fontSize: '10pt', textTransform: 'uppercase' }}>
                SAC
              </Text>
            </div>
          } 
        />

        {/* ---------- CORPS ---------- */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          
          {/* Colonne gauche : Numéro de sac et Destination */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '2mm', borderRight: '0.2mm solid #000' }}>
            
            {/* Numéro de sac (Haut) */}
            <Field label="EXPÉDITEUR">
              <Text variant="strong" style={{ fontSize: '9pt', textTransform: 'uppercase', wordBreak: 'break-word' }}>
                {senderName || '—'}
              </Text>
              <Text variant="small" style={{ marginTop: '1mm', fontSize: '7pt' }}>
                Tél. {senderPhone || '—'}
              </Text>
            </Field>

            <Rule dashed spacing="3mm" />

            {/* Destination (Bas) */}
            <Field label="DESTINATION">
              <Text variant="name" style={{ wordBreak: 'break-word' }}>
                {recipientInfo || '—'}
              </Text>
            </Field>

          </div>

          {/* Colonne droite : QR + code sous le QR */}
          <div
            style={{
              width: '38mm',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <QrBlock src={resolvedQr} size="30mm" framed />
            <Text
              variant="strong"
              style={{ textAlign: 'center', wordBreak: 'break-all', fontSize: '8pt', fontWeight: 900, marginBottom: '10px' }}
            >
              {displayCode || '—'}
            </Text>
          </div>
        </div>

        {/* ---------- PIED : DATE, POIDS, NOMBRE DE COLIS ---------- */}
        <FooterStrip>
          <div style={{ display: 'flex', gap: '5mm', alignItems: 'center', marginBottom: '5px' }}>
            <Text variant="strong" style={{ fontSize: '8pt' }}>
              {displayDate || '—'}
            </Text>
            <Text variant="strong" style={{ fontSize: '8pt' }}>
              {weight ? `${weight} kg.` : '—'}
            </Text>
          </div>
          <div style={{ display: 'flex', gap: '5mm', alignItems: 'center' }}>
            <Text variant="strong" style={{ fontSize: '8pt' }}>
              N° Colis: {parcelCount || '—'}
            </Text>
          </div>
        </FooterStrip>
      </LabelSheet>
    </>
  )
}