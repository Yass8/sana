// src/controllers/invoice.controller.js
const { Invoice, Parcel } = require('../models');
const invoiceService = require('../services/invoice.service');
const emailService = require('../services/email.service');

// ═══════════════════════════════════════════════════════════
// GET /invoices
// ═══════════════════════════════════════════════════════════
const getAll = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.status)   where.status   = req.query.status;
    if (req.query.parcelId) where.parcelId = req.query.parcelId;

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

    // Ajout de l'URL publique du PDF si présent
    const result = invoices.map(inv => {
      const plain = inv.toJSON();
      plain.pdfPublicUrl = inv.pdfUrl ? invoiceService.getInvoicePdfPublicUrl(inv.pdfUrl) : null;
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
    plain.pdfPublicUrl = invoice.pdfUrl ? invoiceService.getInvoicePdfPublicUrl(invoice.pdfUrl) : null;
    res.json(plain);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// POST /invoices
// Crée la facture, génère le PDF, l'upload et stocke pdfUrl
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
      montantPaye = 0,
    } = req.body;

    if (!parcelId) {
      return res.status(400).json({ message: 'parcelId est requis.' });
    }
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

    // Calculs
    const computedSubtotal = subtotal ?? items.reduce(
      (sum, it) => sum + (Number(it.quantite) || 0) * (Number(it.prixUnitaire) || 0),
      0
    );
    const computedTotal = total ?? (computedSubtotal * (1 + Number(taxRate) / 100));

    // Status du facture
    const status = 'draft';
    if (Number(montantPaye) >= computedTotal) {
      status = 'paid';
    }
    if (Number(montantPaye) > 0 && Number(montantPaye) < computedTotal) {
      status = 'partially_paid';
    }
    if (Number(montantPaye) === 0 && computedTotal > 0) {
      status = 'overdue';
    }


    // 1. Création de l'enregistrement
    const invoice = await Invoice.create({
      number: invoiceService.generateInvoiceNumber(),
      parcelId,
      subtotal: computedSubtotal,
      taxRate,
      total: computedTotal,
      currency,
      notes,
      montantPaye: Number(montantPaye) || 0,
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

    // 3. Génération PDF (agence lue dans le service via .env)
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
// PATCH /invoices/:id
// ═══════════════════════════════════════════════════════════
const update = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Facture introuvable.' });

    const allowed = ['status', 'subtotal', 'taxRate', 'total', 'currency', 'notes', 'montantPaye'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    await invoice.update(updates);
    res.json(invoice);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// DELETE /invoices/:id
// Supprime le PDF Supabase + l'enregistrement
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

// Envoi par email : POST /invoices/:id/send-email
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

    // Télécharger le PDF depuis Supabase et l'envoyer en pièce jointe
    let attachment = null
    try {
      if (invoice.pdfUrl) {
        const fileName = String(invoice.pdfUrl).split('/').pop()
        const buffer = await invoiceService.downloadInvoicePDF(fileName)
        if (buffer) attachment = { fileName, buffer }
      }
    } catch (downloadErr) {
      console.error('⚠️ Échec téléchargement PDF pour envoi email :', downloadErr.message)
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
// Retourne uniquement les colis SANS facture
// ═══════════════════════════════════════════════════════════
const getAvailableParcels = async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const { search, limit = 200 } = req.query;

    const where = {};

    // Restriction client : ne voit que ses propres colis
    if (req.user?.role === 'client') {
      where.senderId = req.user.id;
    }

    // Exclure les colis déjà facturés
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
        {
          association: 'invoice',
          attributes: ['id'],
          required: false,          // LEFT JOIN
        },
        {
          association: 'sender',
          attributes: ['id', 'name', 'email', 'phone'],
        },
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
      subQuery: false,              // indispensable pour le filtre $invoice.id$
    });

    res.json(parcels);
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, deleteInvoice, sendEmail, getAvailableParcels };