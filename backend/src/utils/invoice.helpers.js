// src/utils/invoice.helpers.js

/**
 * Calcule la répartition expéditeur / destinataire selon le mode choisi.
 */
function computeShares({ paymentMode, total, senderShare }) {
  const t = Number(total) || 0;
  switch (paymentMode) {
    case 'sender_full':
      return { senderShare: t, recipientShare: 0 };
    case 'recipient_full':
      return { senderShare: 0, recipientShare: t };
    case 'split': {
      const s = Math.max(0, Math.min(Number(senderShare) || 0, t));
      return { senderShare: s, recipientShare: t - s };
    }
    default:
      return { senderShare: 0, recipientShare: t };
  }
}

/**
 * Détermine le statut de la facture selon les montants payés.
 */
function computeStatus({ total, senderPaid = 0, recipientPaid = 0 }) {
  const t    = Number(total) || 0;
  const paid = (Number(senderPaid) || 0) + (Number(recipientPaid) || 0);

  if (t <= 0)      return 'draft';
  if (paid >= t)   return 'paid';
  if (paid > 0)    return 'partially_paid';
  return 'overdue';
}

module.exports = { computeShares, computeStatus };