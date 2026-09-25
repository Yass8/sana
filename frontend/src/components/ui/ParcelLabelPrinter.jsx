// ParcelLabelPrinter.jsx
import {
  BrandHeader,
  CheckItem,
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

export function ParcelLabelPrinter({
  code = '',
  qrcodeUrl = '',
  senderName = 'SANA SERVICE',
  senderPhone = '+33 6 58 07 26 89',
  recipientName = '',
  recipientPhone = '',
  recipientAddress = '',
  weight = '',
  service = '', // 'standard' | 'express'
  urgent = false,
  fragile = false,
  date = '',
  logoUrl = '/lapostelogo.png',
  disabled = false,
  className = '',
  pieceNumber = 1,
  totalPieces = 1,
}) {
  const { pending, labelRef, exportLabel } = useLabelExport('etiquette-colis.pdf')

  const resolvedQr = resolveUrl(qrcodeUrl)
  const isDisabled = disabled || !isValidUrl(qrcodeUrl) || pending
  const tooltip = isDisabled
    ? 'QR code manquant ou invalide. Impossible d’imprimer.'
    : 'Télécharger l’étiquette'

  // Consigne : n'affiche (n/p) que si p > 1
  const displayCode = totalPieces > 1 ? `${code} (${pieceNumber}/${totalPieces})` : code
  const displayDate = formatDate(date)
  const serviceLabel = service === 'express' ? 'EXPRESS' : service === 'standard' ? 'STANDARD' : 'COLIS'

  const handlePrint = () => {
    if (isDisabled) return
    exportLabel(`etiquette-colis-${displayCode || 'qr'}.pdf`)
  }

  return (
    <>
      <PrintButton onClick={handlePrint} disabled={isDisabled} tooltip={tooltip} className={className} />

      <LabelSheet active={pending} innerRef={labelRef}>
        {/* ---------- EN-TÊTE ---------- */}
        <BrandHeader 
          logoUrl={logoUrl} 
          right={
            service ? (
              <div style={{ textAlign: 'right', lineHeight: 1.1 }}>
                <Text variant="micro" style={{ fontSize: '4.5pt', textTransform: 'uppercase' }}>
                  SERVICE
                </Text>
                <Text variant="strong" style={{ fontSize: '10pt', textTransform: 'uppercase' }}>
                  {serviceLabel}
                </Text>
              </div>
            ) : null
          } 
        />

        {/* ---------- CORPS ---------- */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          
          {/* Colonne gauche : Expéditeur et Destinataire */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '2mm', borderRight: '0.2mm solid #000' }}>
            
            {/* Expéditeur (Haut) */}
            <Field label="EXPÉDITEUR">
              <Text variant="strong" style={{ fontSize: '9pt', textTransform: 'uppercase', wordBreak: 'break-word' }}>
                {senderName || '—'}
              </Text>
              <Text variant="small" style={{ marginTop: '1mm', fontSize: '7pt' }}>
                Tél. {senderPhone || '—'}
              </Text>
            </Field>

            <Rule dashed spacing="3mm" />

            {/* Destinataire (Bas) */}
            <Field label="DESTINATAIRE">
              <Text variant="name" style={{ wordBreak: 'break-word' }}>
                {recipientName || '—'}
              </Text>
              <Text variant="body" style={{ marginTop: '1.1mm', wordBreak: 'break-word' }}>
                {recipientAddress || '—'}
              </Text>
              <Text variant="strong" style={{ fontSize: '7pt', marginBottom: '2mm' }}>
                Tél. {recipientPhone || '—'}
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

        {/* ---------- PIED : POIDS, DATE, INDICATEURS ---------- */}
        <FooterStrip>
          <div style={{ display: 'flex', gap: '5mm', alignItems: 'center', marginBottom: '5px' }}>
            <Text variant="strong" style={{ fontSize: '8pt' }}>
              {displayDate + '. ' || '—'}
            </Text>
            <Text variant="strong" style={{ fontSize: '8pt' }}>
              {weight + ' kg.' || '—'}
            </Text>
          </div>
          <div style={{ display: 'flex', gap: '5mm', alignItems: 'center' }}>
            <CheckItem checked={fragile} label="FRAGILE" />
            <CheckItem checked={urgent} label="URGENT" />
          </div>
        </FooterStrip>
      </LabelSheet>
    </>
  )
}