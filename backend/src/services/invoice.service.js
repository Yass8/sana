// src/services/invoice.service.js
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════
// 1. CONFIG
// ═══════════════════════════════════════════════════════════
const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  bucket:      process.env.SUPABASE_BUCKET_INVOICES || 'factures',
};

// Infos statiques de l'agence émettrice (lues depuis .env)
const AGENCE = {
  nom:       process.env.COMPANY_NAME       || 'SANA SERVICE',
  siret:     process.env.COMPANY_SIRET      || '000 000 000 00000',
  tva:       process.env.COMPANY_TVA        || 'FR00 000000000',
  telephone: process.env.COMPANY_PHONE,
  email:     process.env.COMPANY_EMAIL,
  adresse:   process.env.COMPANY_ADDRESS,
  adresse2:  process.env.COMPANY_ADDRESS_2,
};

let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis');
    }
    _supabase = createClient(config.supabaseUrl, config.supabaseKey);
  }
  return _supabase;
}

// ═══════════════════════════════════════════════════════════
// 2. LAYOUT / CONSTANTES (A4)
// ═══════════════════════════════════════════════════════════
const PAGE = { width: 595, height: 842, margin: 50 };
const RIGHT_X = PAGE.width - PAGE.margin;

const COLORS = {
  text:      rgb(0.10, 0.10, 0.10),
  muted:     rgb(0.42, 0.42, 0.42),
  separator: rgb(0.75, 0.78, 0.82),
};

const COL = {
  desc:  PAGE.margin,
  qty:   320,
  unit:  380,
  price: 445,
  tva:   490,
  total: RIGHT_X,
};

// ═══════════════════════════════════════════════════════════
// 3. HELPERS
// ═══════════════════════════════════════════════════════════
const formatNumber = (val) =>
  Number(val).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function generateInvoiceNumber() {
  const timestamp  = Date.now();
  const randomPart = crypto.randomInt(1000, 9999);
  const combined   = timestamp * 10000 + randomPart;
  return (combined % 100000).toString().padStart(5, '0');
}

function drawWrappedText(page, content, opts) {
  const { x, startY, maxChars, size, font, color, fromTop } = opts;
  const words = String(content).split(' ');
  let currentLine = '';
  let y = startY;

  const flush = () => {
    if (currentLine) {
      page.drawText(currentLine.trim(), { x, y: fromTop(y), size, font, color });
    }
  };

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxChars) {
      flush();
      y += 11;
      currentLine = word;
    } else {
      currentLine = (currentLine + ' ' + word).trim();
    }
  }
  if (currentLine) {
    flush();
    y += 14;
  }
  return y;
}

// ═══════════════════════════════════════════════════════════
// 4. GÉNÉRATION DU PDF
// ═══════════════════════════════════════════════════════════
/**
 * Génère un PDF de facture.
 * Les infos de l'agence émettrice sont lues depuis les variables d'env COMPANY_*.
 *
 * @param {Object}   data
 * @param {Object}   data.expediteur    - { nom, email, telephone, adresse, adresse2 }
 * @param {Object}   data.destinataire  - { nom, telephone, adresse }
 * @param {string}  [data.noFacture]
 * @param {string}  [data.dateEmission]
 * @param {Array}    data.items         - { description, subDescription, quantite, unite, prixUnitaire, tva }
 * @param {number}  [data.montantPaye=0]
 * @param {number}  [data.echeanceJours=7]
 * @returns {Promise<Buffer>}
 */
async function generateInvoicePDF(data = {}) {
  const {
    expediteur = {},
    destinataire = {},
    noFacture = generateInvoiceNumber(),
    dateEmission = new Date().toLocaleDateString('fr-FR'),
    items = [],
    montantPaye = 0,
    echeanceJours = 7,
  } = data;

  const pdfDoc   = await PDFDocument.create();
  const page     = pdfDoc.addPage([PAGE.width, PAGE.height]);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const fromTop = (y) => PAGE.height - y;

  const text = (str, x, y, { size = 9.5, font = fontReg, color = COLORS.text } = {}) => {
    if (str == null || str === '') return;
    page.drawText(String(str), { x, y: fromTop(y), size, font, color });
  };

  const textRight = (str, xRight, y, { size = 9.5, font = fontReg, color = COLORS.text } = {}) => {
    if (str == null || str === '') return;
    const s = String(str);
    const w = font.widthOfTextAtSize(s, size);
    page.drawText(s, { x: xRight - w, y: fromTop(y), size, font, color });
  };

  const textCenter = (str, y, { size = 9, font = fontReg, color = COLORS.muted } = {}) => {
    if (str == null || str === '') return;
    const s = String(str);
    const w = font.widthOfTextAtSize(s, size);
    page.drawText(s, { x: (PAGE.width - w) / 2, y: fromTop(y), size, font, color });
  };

  const hLine = (y, { from = PAGE.margin, to = RIGHT_X, thickness = 0.8, color = COLORS.separator } = {}) => {
    page.drawLine({
      start: { x: from, y: fromTop(y) },
      end:   { x: to,   y: fromTop(y) },
      thickness,
      color,
    });
  };

  // ── 1. EN-TÊTE — AGENCE ÉMETTRICE (statique) ────────────
  text(AGENCE.nom, PAGE.margin, 55, { size: 20, font: fontBold });

  [
    AGENCE.nom,
    `n° SIREN / SIRET : ${AGENCE.siret}`,
    `n° TVA : ${AGENCE.tva}`,
    AGENCE.telephone && `Tél : ${AGENCE.telephone}`,
    AGENCE.email,
    AGENCE.adresse,
    AGENCE.adresse2,
  ]
    .filter(Boolean)
    .forEach((line, i) =>
      textRight(line, RIGHT_X, 50 + i * 15, { size: 9, color: COLORS.muted })
    );

  // ── 2. BLOC EXPÉDITEUR + MÉTA ───────────────────────────
  const infoY = 180;

  text('Expéditeur :', PAGE.margin, infoY, { size: 9, font: fontBold });
  text(expediteur.nom || '', PAGE.margin, infoY + 15, { size: 11, font: fontBold });

  const expediteurLines = [
    expediteur.adresse,
    expediteur.adresse2,
    expediteur.telephone && `Tél : ${expediteur.telephone}`,
    expediteur.email,
  ].filter(Boolean);

  expediteurLines.forEach((line, i) =>
    text(line, PAGE.margin, infoY + 32 + i * 13, { size: 9, color: COLORS.muted })
  );

  // Position Y dynamique du bloc destinataire
  const destinataireBlockY = infoY + 32 + expediteurLines.length * 13 + 20;

  text('Destinataire :', PAGE.margin, destinataireBlockY, { size: 9, font: fontBold });
  text(destinataire.nom || '', PAGE.margin, destinataireBlockY + 15, { size: 11, font: fontBold });

  const destinataireLines = [
    destinataire.adresse,
    destinataire.telephone && `Tél : ${destinataire.telephone}`,
  ].filter(Boolean);

  destinataireLines.forEach((line, i) =>
    text(line, PAGE.margin, destinataireBlockY + 32 + i * 13, { size: 9, color: COLORS.muted })
  );

  // Méta facture (colonne droite)
  const echeance = new Date();
  echeance.setDate(echeance.getDate() + echeanceJours);

  [
    `Facture N° : ${noFacture}`,
    `Date de facture : ${dateEmission}`,
    `Date d'échéance : ${echeance.toLocaleDateString('fr-FR')}`,
  ].forEach((line, i) =>
    textRight(line, RIGHT_X, infoY + i * 13, { size: 9, color: COLORS.muted })
  );

  // ── 3. EN-TÊTE TABLEAU ──────────────────────────────────
  const tableY = Math.max(
    destinataireBlockY + 32 + destinataireLines.length * 13 + 40,
    250
  );

  [
    { label: 'Description', x: COL.desc,  align: 'left'  },
    { label: 'Quantité',    x: COL.qty,   align: 'right' },
    { label: 'Unité',       x: COL.unit,  align: 'right' },
    { label: 'Prix',        x: COL.price, align: 'right' },
    { label: 'TVA',         x: COL.tva,   align: 'right' },
    { label: 'Montant',     x: COL.total, align: 'right' },
  ].forEach(({ label, x, align }) =>
    align === 'left'
      ? text(label, x, tableY, { size: 10, font: fontBold })
      : textRight(label, x, tableY, { size: 10, font: fontBold })
  );

  hLine(tableY + 10);

  // ── 4. LIGNES D'ARTICLES ────────────────────────────────
  let currentY = tableY + 28;
  let totalHT  = 0;
  let totalTVA = 0;

  for (const item of items) {
    const qty     = Number(item.quantite)     || 0;
    const price   = Number(item.prixUnitaire) || 0;
    const tvaRate = Number(item.tva)          || 0;

    const lineHT  = qty * price;
    const lineTVA = lineHT * (tvaRate / 100);

    totalHT  += lineHT;
    totalTVA += lineTVA;

    text(item.description || '', COL.desc, currentY);
    textRight(String(item.quantite), COL.qty,   currentY);
    textRight(item.unite || '',      COL.unit,  currentY);
    textRight(formatNumber(price),   COL.price, currentY);
    textRight(`${tvaRate}%`,         COL.tva,   currentY);
    textRight(formatNumber(lineHT),  COL.total, currentY);

    currentY += 14;

    if (item.subDescription) {
      currentY = drawWrappedText(page, item.subDescription, {
        x: COL.desc,
        startY: currentY,
        maxChars: 55,
        size: 8.5,
        font: fontReg,
        color: COLORS.muted,
        fromTop,
      });
      currentY += 4;
    } else {
      currentY += 10;
    }
  }

  hLine(currentY + 2);

  // ── 5. RÉCAPITULATIF FINANCIER ──────────────────────────
  const totalsY      = currentY + 25;
  const totalTTC     = totalHT + totalTVA;
  const resteAPayer  = totalTTC - montantPaye;
  const firstTvaRate = items[0]?.tva || 0;

  const totalRow = (label, value, y, { bold = false, size = 9.5 } = {}) => {
    const font = bold ? fontBold : fontReg;
    text(label, 300, y, { size, font });
    textRight(formatNumber(value), COL.total, y, { size, font });
  };

  totalRow('Sous-total HT', totalHT, totalsY);
  totalRow(`TVA ${firstTvaRate}% de ${formatNumber(totalHT)}`, totalTVA, totalsY + 20);

  hLine(totalsY + 36, { from: 300 });

  totalRow('Montant Total EUR',   totalTTC,     totalsY + 48, { bold: true, size: 10 });
  totalRow('Montant payé',        montantPaye,  totalsY + 68);
  totalRow('Montant à payer EUR', resteAPayer,  totalsY + 92, { bold: true, size: 11 });

  // ── 6. PIED DE PAGE ─────────────────────────────────────
  const footerY = 770;
  hLine(footerY);

  textCenter('Banque : Qonto',                            footerY + 15);
  textCenter('IBAN : FR76 3000 4000 5000 6000 7000 800',  footerY + 30);
  textCenter('BIC : QWERTYUIOP',                          footerY + 45);

  return Buffer.from(await pdfDoc.save());
}

// ═══════════════════════════════════════════════════════════
// 5. STORAGE SUPABASE
// ═══════════════════════════════════════════════════════════
/**
 * Upload un PDF de facture sur Supabase Storage.
 * @returns {Promise<string>} Le nom du fichier (à stocker dans invoice.pdfUrl)
 */
async function uploadInvoicePDF(buffer, noFacture) {
  const fileName = `facture_${noFacture}.pdf`;

  const { error } = await getSupabase()
    .storage
    .from(config.bucket)
    .upload(fileName, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) throw new Error(`Erreur upload Supabase : ${error.message}`);
  return fileName;
}

/**
 * Supprime un PDF de facture depuis Supabase Storage.
 * Accepte soit un simple nom de fichier, soit une URL publique complète.
 */
async function deleteInvoicePDF(pdfUrlOrName) {
  if (!pdfUrlOrName) return { skipped: true };

  const fileName = String(pdfUrlOrName).split('/').pop();

  const { data, error } = await getSupabase()
    .storage
    .from(config.bucket)
    .remove([fileName]);

  if (error) throw new Error(`Erreur suppression Supabase : ${error.message}`);
  return { deleted: true, fileName, data };
}

/**
 * Construit l'URL publique d'une facture.
 */
function getInvoicePdfPublicUrl(fileName) {
  if (!fileName) return null;
  const { data } = getSupabase()
    .storage
    .from(config.bucket)
    .getPublicUrl(fileName);
  return data?.publicUrl || null;
}

/**
 * Télécharge le PDF de la facture depuis Supabase Storage et retourne un Buffer.
 * Accepte soit un nom de fichier simple, soit une URL publique complète.
 * @returns {Promise<Buffer>}
 */
async function downloadInvoicePDF(pdfUrlOrName) {
  if (!pdfUrlOrName) return null;

  const fileName = String(pdfUrlOrName).split('/').pop();

  const { data, error } = await getSupabase()
    .storage
    .from(config.bucket)
    .download(fileName);

  if (error) throw new Error(`Erreur téléchargement Supabase : ${error.message}`);

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ═══════════════════════════════════════════════════════════
// 6. EXPORT
// ═══════════════════════════════════════════════════════════
module.exports = {
  generateInvoicePDF,
  uploadInvoicePDF,
  deleteInvoicePDF,
  getInvoicePdfPublicUrl,
  downloadInvoicePDF,
  generateInvoiceNumber,
  config,
};