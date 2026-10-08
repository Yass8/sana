// src/controllers/invoice.controller.js
const { Invoice, Parcel } = require('../models');
const invoiceService = require('../services/invoice.service');
const emailService   = require('../services/email.service');
const { computeShares, computeStatus } = require('../utils/invoice.helpers');

// ═══════════════════════════════════════════════════════════
// GET /invoices
// ═══════════════════════════════════════════════════════════
const getAll = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.status)      where.status      = req.query.status;
    if (req.query.parcelId)    where.parcelId    = req.query.parcelId;
    if (req.query.paymentMode) where.paymentMode = req.query.paymentMode;

    const invoices = await Invoice.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [
        {
          association: 'parcel',
          attributes: ['id', 'qrcode', 'recipientName', 'status'],
          include: [
            { association: 'sender', attributes: ['id', 'name', 'email'] },
          ],
        },
      ],
    });

    const result = invoices.map(inv => {
      const plain = inv.toJSON();
      plain.pdfPublicUrl = inv.pdfUrl
        ? invoiceService.getInvoicePdfPublicUrl(inv.pdfUrl)
        : null;
      return plain;
    });

    res.json(result);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// GET /invoices/:id
// ═══════════════════════════════════════════════════════════
const getById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        {
          association: 'parcel',
          include: [
            { association: 'sender', attributes: ['id', 'name', 'email', 'phone'] },
          ],
        },
      ],
    });

    if (!invoice) return res.status(404).json({ message: 'Facture introuvable.' });
    const plain = invoice.toJSON();
    plain.pdfPublicUrl = invoice.pdfUrl
      ? invoiceService.getInvoicePdfPublicUrl(invoice.pdfUrl)
      : null;
    res.json(plain);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// POST /invoices
// Crée la facture avec répartition + paiements initiaux
// ═══════════════════════════════════════════════════════════
const create = async (req, res, next) => {
  try {
    const {
      parcelId,
      items = [],
      subtotal,
      taxRate = 0,
      total,
      currency = 'EUR',
      notes,
      // ── Nouveaux champs ────────────────────────────────
      paymentMode     = 'recipient_full',
      paymentLocation = null,
      senderShare     = 0,
      senderPaid      = 0,
      recipientPaid   = 0,
    } = req.body;

    if (!parcelId) return res.status(400).json({ message: 'parcelId est requis.' });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Au moins un item est requis.' });
    }

    // Colis + sender
    const parcel = await Parcel.findByPk(parcelId, {
      include: [
        { association: 'sender' },
        { association: 'invoice' },
      ],
    });

    if (!parcel)        return res.status(404).json({ message: 'Colis introuvable.' });
    if (parcel.invoice) return res.status(409).json({ message: 'Une facture existe déjà pour ce colis.' });

    // Calculs montants
    const computedSubtotal = subtotal ?? items.reduce(
      (sum, it) => sum + (Number(it.quantite) || 0) * (Number(it.prixUnitaire) || 0),
      0
    );
    const computedTotal = total ?? (computedSubtotal * (1 + Number(taxRate) / 100));

    // Répartition selon le mode
    const shares = computeShares({
      paymentMode,
      total: computedTotal,
      senderShare,
    });

    // Garde-fous sur les montants payés
    const sPaid = Math.max(0, Math.min(Number(senderPaid) || 0,    shares.senderShare));
    const rPaid = Math.max(0, Math.min(Number(recipientPaid) || 0, shares.recipientShare));
    const montantPaye = sPaid + rPaid;

    // Statut calculé
    const status = computeStatus({
      total: computedTotal,
      senderPaid: sPaid,
      recipientPaid: rPaid,
    });

    // 1. Création de l'enregistrement
    const invoice = await Invoice.create({
      number: invoiceService.generateInvoiceNumber(),
      parcelId,
      subtotal: computedSubtotal,
      taxRate,
      total: computedTotal,
      currency,
      notes,
      paymentMode,
      paymentLocation,
      senderShare:    shares.senderShare,
      recipientShare: shares.recipientShare,
      senderPaid:     sPaid,
      recipientPaid:  rPaid,
      montantPaye,
      status,
    });

    // 2. Blocs variables pour le PDF
    const expediteur = {
      nom:       parcel.sender?.name,
      email:     parcel.sender?.email,
      telephone: parcel.sender?.phone,
    };

    const destinataire = {
      nom:       parcel.recipientName,
      adresse:   parcel.recipientAddress,
      telephone: parcel.recipientPhone,
    };

    // 3. Génération PDF
    const pdfBuffer = await invoiceService.generateInvoicePDF({
      expediteur,
      destinataire,
      noFacture: invoice.number,
      items,
      montantPaye,
    });

    // 4. Upload + persist pdfUrl
    const fileName = await invoiceService.uploadInvoicePDF(pdfBuffer, invoice.number);
    await invoice.update({ pdfUrl: fileName });

    res.status(201).json(invoice);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// POST /invoices/:id/pay
// Enregistre un encaissement (acompte ou solde)
// ═══════════════════════════════════════════════════════════
const pay = async (req, res, next) => {
  try {
    const { payerType, amount } = req.body;
    

    if (!['sender', 'recipient'].includes(payerType)) {
      return res.status(400).json({ message: 'payerType doit être "sender" ou "recipient".' });
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ message: 'Montant invalide.' });
    }

    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Facture introuvable.' });

    // Part due selon le payeur
    const share      = payerType === 'sender' ? Number(invoice.senderShare)    : Number(invoice.recipientShare);
    const alreadyPaid = payerType === 'sender' ? Number(invoice.senderPaid)    : Number(invoice.recipientPaid);

    if (alreadyPaid + amt > share + 0.001) {
      return res.status(409).json({
        message: `Le montant dépasse la part due (${share.toFixed(2)} ${invoice.currency}).`,
      });
    }

    const updates = payerType === 'sender'
      ? { senderPaid:    alreadyPaid + amt }
      : { recipientPaid: alreadyPaid + amt };

    const newSenderPaid    = payerType === 'sender'    ? updates.senderPaid    : Number(invoice.senderPaid);
    const newRecipientPaid = payerType === 'recipient' ? updates.recipientPaid : Number(invoice.recipientPaid);

    updates.montantPaye = newSenderPaid + newRecipientPaid;
    updates.status = computeStatus({
      total: Number(invoice.total),
      senderPaid: newSenderPaid,
      recipientPaid: newRecipientPaid,
    });

    await invoice.update(updates);
    res.json(invoice);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// PATCH /invoices/:id
// ═══════════════════════════════════════════════════════════
const update = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        message: 'Facture introuvable.'
      });
    }

    const allowed = [
      'subtotal',
      'taxRate',
      'total',
      'currency',
      'notes',
      'paymentMode',
      'paymentLocation',
      'senderShare',
      'senderPaid',
      'recipientPaid',
    ];

    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // ─────────────────────────────────────────────
    // Valeurs finales de la facture
    // ─────────────────────────────────────────────

    const finalTotal =
      updates.total !== undefined
        ? Number(updates.total)
        : Number(invoice.total);

    const finalPaymentMode =
      updates.paymentMode !== undefined
        ? updates.paymentMode
        : invoice.paymentMode;

    const finalSenderPaid =
      updates.senderPaid !== undefined
        ? Number(updates.senderPaid)
        : Number(invoice.senderPaid);

    const finalRecipientPaid =
      updates.recipientPaid !== undefined
        ? Number(updates.recipientPaid)
        : Number(invoice.recipientPaid);

    // ─────────────────────────────────────────────
    // Recalcul des parts
    // ─────────────────────────────────────────────

    if (
      updates.paymentMode !== undefined ||
      updates.senderShare !== undefined ||
      updates.total !== undefined
    ) {
      const shares = computeShares({
        paymentMode: finalPaymentMode,
        total: finalTotal,
        senderShare:
          updates.senderShare !== undefined
            ? Number(updates.senderShare)
            : Number(invoice.senderShare),
      });

      updates.senderShare = shares.senderShare;
      updates.recipientShare = shares.recipientShare;
    }

    // ─────────────────────────────────────────────
    // Vérification des paiements
    // ─────────────────────────────────────────────

    const finalSenderShare =
      updates.senderShare !== undefined
        ? Number(updates.senderShare)
        : Number(invoice.senderShare);

    const finalRecipientShare =
      updates.recipientShare !== undefined
        ? Number(updates.recipientShare)
        : Number(invoice.recipientShare);

    if (finalSenderPaid < 0 || finalRecipientPaid < 0) {
      return res.status(400).json({
        message: 'Les montants payés ne peuvent pas être négatifs.'
      });
    }

    if (finalSenderPaid > finalSenderShare + 0.001) {
      return res.status(400).json({
        message: 'Le montant payé par l’expéditeur dépasse sa part.'
      });
    }

    if (finalRecipientPaid > finalRecipientShare + 0.001) {
      return res.status(400).json({
        message: 'Le montant payé par le destinataire dépasse sa part.'
      });
    }

    // ─────────────────────────────────────────────
    // Montant total payé
    // ─────────────────────────────────────────────

    const montantPaye =
      finalSenderPaid + finalRecipientPaid;

    updates.senderPaid = finalSenderPaid;
    updates.recipientPaid = finalRecipientPaid;
    updates.montantPaye = montantPaye;

    // ─────────────────────────────────────────────
    // Statut calculé par le backend
    // ─────────────────────────────────────────────

    updates.status = computeStatus({
      total: finalTotal,
      senderPaid: finalSenderPaid,
      recipientPaid: finalRecipientPaid,
    });

    // ─────────────────────────────────────────────
    // Récupération du colis pour le PDF
    // ─────────────────────────────────────────────

    const parcel = await Parcel.findByPk(invoice.parcelId, {
      include: [
        {
          association: 'sender',
        },
      ],
    });

    if (!parcel) {
      return res.status(404).json({
        message: 'Colis introuvable.'
      });
    }

    // ─────────────────────────────────────────────
    // Régénération du PDF
    // ─────────────────────────────────────────────

    if (
      updates.paymentMode !== undefined ||
      updates.total !== undefined
    ) {
      const fileName =
        await invoiceService.regenerateInvoicePDF(
          invoice,
          {
            ...updates,
            parcel: parcel.toJSON(),
          }
        );

      updates.pdfUrl = fileName;
    }

    // ─────────────────────────────────────────────
    // Sauvegarde
    // ─────────────────────────────────────────────

    await invoice.update(updates);

    res.json(invoice);

  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// DELETE /invoices/:id
// ═══════════════════════════════════════════════════════════
const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Facture introuvable.' });

    if (invoice.pdfUrl) {
      try {
        await invoiceService.deleteInvoicePDF(invoice.pdfUrl);
      } catch (pdfErr) {
        console.error(`⚠️ Échec suppression PDF ${invoice.pdfUrl} :`, pdfErr.message);
      }
    }

    await invoice.destroy();
    res.json({ message: 'Facture supprimée avec succès.' });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// POST /invoices/:id/send-email
// ═══════════════════════════════════════════════════════════
const sendEmail = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        { association: 'parcel', include: [{ association: 'sender' }] },
      ],
    });
    if (!invoice) return res.status(404).json({ message: 'Facture introuvable.' });

    const to = req.body.to || invoice.parcel?.sender?.email;
    if (!to) return res.status(400).json({ message: 'Adresse email destinataire requise.' });

    let attachment = null;
    try {
      if (invoice.pdfUrl) {
        const fileName = String(invoice.pdfUrl).split('/').pop();
        const buffer = await invoiceService.downloadInvoicePDF(fileName);
        if (buffer) attachment = { fileName, buffer };
      }
    } catch (downloadErr) {
      console.error('⚠️ Échec téléchargement PDF pour envoi email :', downloadErr.message);
    }

    const info = await emailService.sendInvoiceEmail({
      to,
      name: req.body.name || invoice.parcel?.sender?.name,
      invoiceNumber: invoice.number,
      attachment,
    });

    res.json({ message: 'Email envoyé', info, attached: !!attachment });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// GET /invoices/available-parcels
// ═══════════════════════════════════════════════════════════
const getAvailableParcels = async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const { search, limit = 200 } = req.query;

    const where = {};
    if (req.user?.role === 'client') where.senderId = req.user.id;
    where['$invoice.id$'] = null;

    if (search) {
      where[Op.or] = [
        { qrcode:        { [Op.like]: `%${search}%` } },
        { recipientName: { [Op.like]: `%${search}%` } },
      ];
    }

    const parcels = await Parcel.findAll({
      where,
      include: [
        { association: 'invoice', attributes: ['id'], required: false },
        { association: 'sender',  attributes: ['id', 'name', 'email', 'phone'] },
        {
          association: 'bag',
          attributes: ['id', 'qrcode'],
          include: [
            { association: 'destinationAgency', attributes: ['id', 'name', 'city'] },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit, 10),
      subQuery: false,
    });

    res.json(parcels);
  } catch (err) { next(err); }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  deleteInvoice,
  sendEmail,
  getAvailableParcels,
  pay,
};