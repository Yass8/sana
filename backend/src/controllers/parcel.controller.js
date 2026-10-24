// src/controllers/parcel.controller.js
// ═══════════════════════════════════════════════════════════════
// Contrôleur des colis
// ───────────────────────────────────────────────────────────────
// Contient :
//   • CRUD colis
//   • Transitions de statut (individuel + via sac)
//   • Création combinée colis + facture (createWithInvoice)
//
// Conventions :
//   • Les transactions Sequelize englobent toutes les écritures liées
//     (parcel + tracking + notification + bag weight + invoice)
//   • Les opérations lentes (QR, PDF, emails) tournent HORS transaction
//     → un échec n'invalide pas la création
//   • Les erreurs non-bloquantes sont remontées dans `warnings[]`
// ═══════════════════════════════════════════════════════════════

const {
  Parcel, Bag, TrackingEvent, Notification,
  User, Agency, Invoice, sequelize,
} = require('../models')
const {
  PARCEL_STATUS, NOTIF_TYPE, NOTIF_CHANNEL, NOTIF_STATUS,
  ROLES, canTransition,
} = require('../constants')
const { generateQRCode, deleteQRCode } = require('../services/qrcode.service')
const { generateCode } = require('../services/codeGenerator.service')
const { sendStatusEmail, sendWelcomeEmail } = require('../services/email.service')
const invoiceService = require('../services/invoice.service')
const { computeShares, computeStatus } = require('../utils/invoice.helpers')
const { Op } = require('sequelize')

// ───────────────────────────────────────────────────────────────
// CONSTANTES
// ───────────────────────────────────────────────────────────────

const PARCEL_TYPES = [
  'client', 'amazon', 'shein', 'temu', 'colissimo',
  'chronopost', 'dhl', 'ups', 'fedex', 'autre',
]

// Agences utilisées pour les colis individuels (non rattachés à un sac)
const DEFAULT_ORIGIN_AGENCY_ID      = '69ab1a3a-0989-485b-851b-a7430a6e38e0'
const DEFAULT_DESTINATION_AGENCY_ID = 'bf0ff001-79b5-4aef-bcce-3038aac4165b'

// Attributs renvoyés sur les agences dans les emails (allégé)
const AGENCY_EMAIL_ATTRS = ['name', 'city', 'address', 'phone']

// Include complet pour les réponses détaillées
const INCLUDE_FULL = [
  { association: 'sender', attributes: ['id', 'name', 'email', 'phone'] },
  { association: 'invoice' },
  {
    association: 'bag',
    include: [
      { association: 'originAgency',      attributes: ['id', 'name', 'city', 'country'] },
      { association: 'destinationAgency', attributes: ['id', 'name', 'city', 'country'] },
    ],
  },
  {
    association: 'trackingEvents',
    include: [{ association: 'agent', attributes: ['id', 'name'] }],
    order: [['occurredAt', 'DESC']],
  },
]

// ═══════════════════════════════════════════════════════════════
// HELPERS PRIVÉS (module-level)
// ═══════════════════════════════════════════════════════════════

/**
 * Génère un mot de passe temporaire alphanumérique.
 * Utilisé lors de la création d'un client inline.
 */
const generateTempPassword = (length = 6) => {
  const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from(
    { length },
    () => ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)]
  ).join('')
}

/**
 * Recalcule le poids total d'un sac à partir de ses colis.
 * À appeler dans une transaction pour rester cohérent.
 */
const recalculateBagWeight = async (bag, transaction) => {
  const parcels = await Parcel.findAll({
    where: { bagId: bag.id },
    attributes: ['weight'],
    transaction,
  })
  const totalWeight = parcels.reduce(
    (sum, p) => sum + (parseFloat(p.weight) || 0),
    0
  )
  await bag.update({ weight: totalWeight }, { transaction })
  return totalWeight
}

/**
 * Résout les agences d'origine et de destination pour l'email de statut.
 *
 * - Colis en sac : utilise les agences du sac.
 * - Colis individuel : utilise les agences fixes (DEFAULT_*).
 *
 * @returns {Promise<{ originAgency, destinationAgency, bagCode }>}
 */
const resolveAgenciesForEmail = async (bag) => {
  if (bag) {
    const freshBag = await Bag.findByPk(bag.id, {
      include: [
        { association: 'originAgency',      attributes: AGENCY_EMAIL_ATTRS },
        { association: 'destinationAgency', attributes: AGENCY_EMAIL_ATTRS },
      ],
    })
    return {
      originAgency:      freshBag?.originAgency      ?? null,
      destinationAgency: freshBag?.destinationAgency ?? null,
      bagCode:           freshBag?.qrcode            ?? null,
    }
  }

  const [origin, destination] = await Promise.all([
    Agency.findByPk(DEFAULT_ORIGIN_AGENCY_ID,      { attributes: AGENCY_EMAIL_ATTRS }),
    Agency.findByPk(DEFAULT_DESTINATION_AGENCY_ID, { attributes: AGENCY_EMAIL_ATTRS }),
  ])
  return { originAgency: origin, destinationAgency: destination, bagCode: null }
}

/**
 * Génère et persiste l'image QR code du colis.
 * Non-bloquant : log l'erreur sans throw.
 */
const generateAndPersistParcelQRCode = async (parcel) => {
  const qrcodeUrl = await generateQRCode(parcel.qrcode, 'parcel')
  await parcel.update({ qrcodeUrl })
  return qrcodeUrl
}

/**
 * Envoie l'email de réception (statut initial) et met à jour la notification.
 * Non-bloquant : log + update statut notification, ne throw pas.
 */
const notifyParcelReceived = async ({ parcel, sender, bag, notes }) => {
  const { originAgency, destinationAgency, bagCode } =
    await resolveAgenciesForEmail(bag)

  try {
    await sendStatusEmail({
      to:            sender.email,
      parcelCode:    parcel.qrcode,
      status:        PARCEL_STATUS.RECEIVED,
      recipientName: parcel.recipientName,
      senderName:    sender.name,
      type:          parcel.type,
      notes:         notes || 'Colis réceptionné en agence.',
      date:          new Date(),
      origin: originAgency
        ? { city: originAgency.city, adresse: originAgency.address, phone: originAgency.phone }
        : null,
      destination: destinationAgency
        ? { city: destinationAgency.city, adresse: destinationAgency.address, phone: destinationAgency.phone }
        : null,
      colis: {
        weight: parcel.weight,
        description: parcel.description,
        type: parcel.type,
      },
      bagCode,
    })

    await Notification.update(
      { status: NOTIF_STATUS.SENT, sentAt: new Date() },
      {
        where: {
          parcelId: parcel.id,
          userId:   sender.id,
          type:     NOTIF_TYPE.STATUS_UPDATE,
        },
      }
    )
  } catch (emailErr) {
    console.error('Erreur envoi email statut:', emailErr)
    await Notification.update(
      { status: NOTIF_STATUS.FAILED, errorMessage: emailErr.message },
      {
        where: {
          parcelId: parcel.id,
          userId:   sender.id,
          type:     NOTIF_TYPE.STATUS_UPDATE,
        },
      }
    )
  }
}

/**
 * Résout l'expéditeur à partir de `senderId` OU `senderData`.
 * - senderId  → cherche en BDD, throw si introuvable
 * - senderData → réutilise si email existe, sinon crée
 *
 * @returns {Promise<{ sender, isNew, tempPassword }>}
 */
const resolveSender = async ({ senderId, senderData }, transaction) => {
  // Cas 1 : client existant
  if (senderId) {
    const sender = await User.findByPk(senderId, {
      attributes: ['id', 'name', 'email', 'phone', 'adresse'],
      transaction,
    })
    if (!sender) throw new Error('Expéditeur introuvable.')
    return { sender, isNew: false, tempPassword: null }
  }

  // Cas 2 : lookup par email (évite les doublons silencieux)
  const existing = await User.findOne({
    where: { email: senderData.email },
    transaction,
  })
  if (existing) {
    return { sender: existing, isNew: false, tempPassword: null }
  }

  // Cas 3 : création d'un nouveau client
  const tempPassword = generateTempPassword()
  const sender = await User.create({
    name:         senderData.name,
    email:        senderData.email,
    phone:        senderData.phone   || null,
    adresse:      senderData.adresse || null,
    role:         'client',
    passwordHash: tempPassword, // hashé par le hook beforeCreate
    isActive:     true,
  }, { transaction })

  return { sender, isNew: true, tempPassword }
}

/**
 * Calcule toutes les valeurs de la facture à partir des items et du mode de paiement.
 * Centralise la logique pour éviter les calculs dispersés.
 */
const computeInvoiceAmounts = ({
  items,
  taxRate,
  paymentMode,
  senderShare,
  senderPaid,
  recipientPaid,
}) => {
  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.quantite) || 0) * (Number(it.prixUnitaire) || 0),
    0
  )
  const total = subtotal * (1 + Number(taxRate) / 100)

  const shares = computeShares({ paymentMode, total, senderShare })

  const sPaid = Math.max(0, Math.min(Number(senderPaid) || 0,    shares.senderShare))
  const rPaid = Math.max(0, Math.min(Number(recipientPaid) || 0, shares.recipientShare))
  const montantPaye = sPaid + rPaid

  const status = computeStatus({
    total,
    senderPaid:    sPaid,
    recipientPaid: rPaid,
  })

  return { subtotal, total, shares, sPaid, rPaid, montantPaye, status }
}

/**
 * Génère le PDF de la facture et l'upload sur le storage.
 * Persiste `pdfUrl` sur l'invoice.
 * Non-bloquant : log l'erreur sans throw.
 */
const generateAndUploadInvoicePDF = async ({ invoice, parcel, sender, items, montantPaye }) => {
  const expediteur = {
    nom:       sender.name,
    email:     sender.email,
    telephone: sender.phone,
  }
  const destinataire = {
    nom:       parcel.recipientName,
    adresse:   parcel.recipientAddress,
    telephone: parcel.recipientPhone,
  }

  const pdfBuffer = await invoiceService.generateInvoicePDF({
    expediteur,
    destinataire,
    noFacture: invoice.number,
    items,
    montantPaye,
  })

  const fileName = await invoiceService.uploadInvoicePDF(pdfBuffer, invoice.number)
  await invoice.update({ pdfUrl: fileName })
  return fileName
}

// ═══════════════════════════════════════════════════════════════
// READ (GET)
// ═══════════════════════════════════════════════════════════════

/**
 * Liste paginée des colis avec filtres.
 * Les clients ne voient que leurs propres colis.
 */
const getAll = async (req, res, next) => {
  try {
    const {
      status, search, bagId, type,
      page = 1, limit = 15,
      sortBy = 'createdAt', sortDir = 'DESC',
    } = req.query

    const where = {}
    if (status) where.status = status
    if (type)   where.type   = type

    if (bagId !== undefined) {
      where.bagId = bagId === 'null' ? null : bagId
    }
    if (search) {
      where[Op.or] = [
        { qrcode:        { [Op.like]: `%${search}%` } },
        { recipientName: { [Op.like]: `%${search}%` } },
      ]
    }
    if (req.user.role === 'client') {
      where.senderId = req.user.id
    }

    const offset = (parseInt(page) - 1) * parseInt(limit)
    const order  = [[sortBy, sortDir.toUpperCase()]]

    const { count, rows } = await Parcel.findAndCountAll({
      where,
      include: [
        { association: 'sender', attributes: ['id', 'name'] },
        {
          association: 'bag',
          include: [
            { association: 'originAgency',      attributes: ['id', 'name', 'city'] },
            { association: 'destinationAgency', attributes: ['id', 'name', 'city'] },
          ],
        },
      ],
      order,
      limit:    parseInt(limit),
      offset,
      distinct: true,
    })

    res.json({
      count,
      rows,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
    })
  } catch (err) { next(err) }
}

/**
 * Détail d'un colis par ID.
 * Un client ne peut consulter que ses colis.
 */
const getById = async (req, res, next) => {
  try {
    const parcel = await Parcel.findByPk(req.params.id, { include: INCLUDE_FULL })
    if (!parcel) return res.status(404).json({ message: 'Colis introuvable.' })

    if (req.user.role === 'client' && parcel.senderId !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé.' })
    }
    res.json(parcel)
  } catch (err) { next(err) }
}

/**
 * Recherche par QR code (route publique de suivi).
 */
const trackByQRCode = async (req, res, next) => {
  try {
    const parcel = await Parcel.findOne({
      where: { qrcode: req.params.qrcode },
      include: INCLUDE_FULL,
    })
    if (!parcel) return res.status(404).json({ message: 'Colis introuvable.' })
    res.json(parcel)
  } catch (err) { next(err) }
}

/**
 * Retourne (ou régénère) l'URL du QR code du colis.
 */
const getQRCode = async (req, res, next) => {
  try {
    const parcel = await Parcel.findByPk(req.params.id, {
      attributes: ['id', 'qrcode', 'qrCodeUrl'],
    })
    if (!parcel) return res.status(404).json({ message: 'Colis introuvable.' })

    if (!parcel.qrCodeUrl) {
      const url = await generateQRCode(parcel.qrcode, 'parcel')
      await parcel.update({ qrCodeUrl: url })
      return res.json({ qrcode: parcel.qrcode, url })
    }

    res.json({ qrcode: parcel.qrcode, url: parcel.qrCodeUrl })
  } catch (err) { next(err) }
}

/**
 * Historique journalier des colis créés à une date donnée.
 * Utilisé pour la page Historique et l'export PDF.
 */
const getDailyHistory = async (req, res, next) => {
  try {
    const { date } = req.query
    if (!date) {
      return res.status(400).json({ message: 'Le paramètre date est requis (YYYY-MM-DD).' })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'Format de date invalide (YYYY-MM-DD).' })
    }

    const startOfDay = new Date(`${date}T00:00:00.000Z`)
    const endOfDay   = new Date(`${date}T23:59:59.999Z`)

    const where = {
      createdAt: { [Op.gte]: startOfDay, [Op.lte]: endOfDay },
    }
    if (req.user.role === ROLES.CLIENT) {
      where.senderId = req.user.id
    }

    const parcels = await Parcel.findAll({
      where,
      include: [{ association: 'sender', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
    })

    res.json({ date, parcels, count: parcels.length })
  } catch (err) { next(err) }
}

// ═══════════════════════════════════════════════════════════════
// CREATE (POST)
// ═══════════════════════════════════════════════════════════════

/**
 * Création d'un colis SANS facture.
 * Utilisé par l'ancien flux (page /parcels/new).
 *
 * @deprecated Préférer `createWithInvoice` qui crée tout en un.
 */
const create = async (req, res, next) => {
  try {
    const {
      bagId, senderId, recipientName, recipientPhone, recipientAddress,
      description, weight, service, type, urgent, fragile,
    } = req.body

    if (!senderId || !recipientName) {
      return res.status(400).json({ message: 'senderId et recipientName sont requis.' })
    }

    const normalizedType = (type && PARCEL_TYPES.includes(type)) ? type : 'client'

    const sender = await User.findByPk(senderId, {
      attributes: ['id', 'name', 'email', 'phone', 'adresse'],
    })
    if (!sender) {
      return res.status(404).json({ message: 'Expéditeur introuvable.' })
    }

    let bag = null
    if (bagId) {
      bag = await Bag.findByPk(bagId)
      if (!bag) return res.status(404).json({ message: 'Sac introuvable.' })
      if (bag.status !== 'ouvert') {
        return res.status(400).json({ message: 'Ce sac est fermé. Impossible d\'ajouter un colis.' })
      }
    }

    // ── Transaction : parcel + tracking + notification + bag weight ──
    let parcel
    await sequelize.transaction(async (t) => {
      const qrcode = await generateCode('parcel')

      parcel = await Parcel.create({
        bagId: bagId || null,
        senderId,
        recipientName,
        recipientPhone:   recipientPhone   ?? null,
        recipientAddress: recipientAddress ?? null,
        description:      description      ?? null,
        weight:           weight           ?? null,
        qrcode,
        status:  PARCEL_STATUS.RECEIVED,
        service: service ?? 'standard',
        type:    normalizedType,
        urgent:  urgent  ?? false,
        fragile: fragile ?? false,
      }, { transaction: t })

      await TrackingEvent.create({
        parcelId:   parcel.id,
        agentId:    req.user.id,
        status:     PARCEL_STATUS.RECEIVED,
        occurredAt: new Date(),
        notes:      'Colis réceptionné en agence.',
      }, { transaction: t })

      await Notification.create({
        parcelId:       parcel.id,
        userId:         senderId,
        recipientEmail: sender.email,
        channel:        NOTIF_CHANNEL.EMAIL,
        type:           NOTIF_TYPE.STATUS_UPDATE,
        status:         NOTIF_STATUS.PENDING,
      }, { transaction: t })

      if (bag) {
        await recalculateBagWeight(bag, t)
      }
    })

    // ── Finalisation hors transaction (non-bloquant) ──
    try {
      await generateAndPersistParcelQRCode(parcel)
    } catch (qrErr) {
      console.error('Erreur génération QR code:', qrErr)
    }

    await notifyParcelReceived({
      parcel,
      sender,
      bag,
      notes: 'Colis réceptionné en agence.',
    })

    res.status(201).json(
      await Parcel.findByPk(parcel.id, { include: INCLUDE_FULL })
    )
  } catch (err) { next(err) }
}

/**
 * Création d'un colis ET de sa facture en une seule requête.
 *
 * ─────────────────────────────────────────────────────────────
 * Flow :
 *   1. Validation fail-fast (avant toute écriture BDD)
 *   2. Calculs facture (subtotal, shares, statut)
 *   3. Transaction atomique :
 *      a. Résolution/création du sender
 *      b. Création du parcel + tracking + notification
 *      c. Recalcul du poids du sac (si applicable)
 *      d. Création de la facture
 *   4. Finalisation hors transaction (QR, PDF, emails) — non-bloquante
 *   5. Réponse enrichie avec warnings éventuels
 *
 * ─────────────────────────────────────────────────────────────
 * Payload :
 *   {
 *     senderId      : UUID (si client existant)
 *     | senderData  : { name, email, phone?, adresse? } (nouveau client)
 *     recipientName : string (requis)
 *     recipientPhone, recipientAddress : string?
 *     bagId         : UUID? (sac ouvert uniquement)
 *     description   : string?
 *     weight        : number > 0 (requis)
 *     service, type, urgent, fragile : optionnels
 *     items         : [{ description, quantite, prixUnitaire, tva?, ... }] (requis)
 *     taxRate       : number (def. 0)
 *     currency      : string (def. "EUR")
 *     notes         : string?
 *     paymentMode   : 'sender_full' | 'recipient_full' | 'split'
 *     senderShare   : number (si split)
 *     senderPaid    : number (acompte)
 *     recipientPaid : number (acompte)
 *   }
 */
const createWithInvoice = async (req, res, next) => {
  try {
    const body = req.body

    // ═══════════════════════════════════════════════════════════
    // 1. VALIDATION
    // ═══════════════════════════════════════════════════════════

    if (!body.senderId && !body.senderData?.email) {
      return res.status(400).json({
        message: 'Fournir senderId (client existant) ou senderData avec email (nouveau client).',
      })
    }
    if (!body.recipientName?.trim()) {
      return res.status(400).json({ message: 'Le nom du destinataire est requis.' })
    }

    const weightNum = parseFloat(body.weight)
    if (!weightNum || weightNum <= 0) {
      return res.status(400).json({ message: 'Le poids doit être supérieur à 0.' })
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ message: 'Au moins un article est requis.' })
    }

    // Vérifier le sac AVANT la transaction (fail-fast sur ressource externe)
    let bag = null
    if (body.bagId) {
      bag = await Bag.findByPk(body.bagId)
      if (!bag) {
        return res.status(404).json({ message: 'Sac introuvable.' })
      }
      if (bag.status !== 'ouvert') {
        return res.status(400).json({
          message: 'Ce sac est fermé. Impossible d\'y ajouter un colis.',
        })
      }
    }

    // ═══════════════════════════════════════════════════════════
    // 2. CALCULS FACTURE (avant transaction, purs)
    // ═══════════════════════════════════════════════════════════

    const invoiceData = computeInvoiceAmounts({
      items:         body.items,
      taxRate:       body.taxRate       ?? 0,
      paymentMode:   body.paymentMode   ?? 'recipient_full',
      paymentMethod: body.paymentMethod ?? '',
      senderShare:   body.senderShare   ?? 0,
      senderPaid:    body.senderPaid    ?? 0,
      recipientPaid: body.recipientPaid ?? 0,
    })

    // ═══════════════════════════════════════════════════════════
    // 3. TRANSACTION ATOMIQUE
    // ═══════════════════════════════════════════════════════════

    let parcel, invoice, sender, isNewSender = false, tempPassword = null

    await sequelize.transaction(async (t) => {
      // 3a. Sender : existant ou nouveau
      const senderResult = await resolveSender(
        { senderId: body.senderId, senderData: body.senderData },
        t
      )
      sender       = senderResult.sender
      isNewSender  = senderResult.isNew
      tempPassword = senderResult.tempPassword

      // 3b. Parcel + tracking + notification
      const qrcode = await generateCode('parcel')
      parcel = await Parcel.create({
        bagId:            body.bagId || null,
        senderId:         sender.id,
        recipientName:    body.recipientName.trim(),
        recipientPhone:   body.recipientPhone   ?? null,
        recipientAddress: body.recipientAddress ?? null,
        description:      body.description      ?? null,
        weight:           weightNum,
        qrcode,
        status:  PARCEL_STATUS.RECEIVED,
        service: body.service ?? 'standard',
        type:    (body.type && PARCEL_TYPES.includes(body.type)) ? body.type : 'client',
        urgent:  body.urgent  ?? false,
        fragile: body.fragile ?? false,
      }, { transaction: t })

      await TrackingEvent.create({
        parcelId:   parcel.id,
        agentId:    req.user.id,
        status:     PARCEL_STATUS.RECEIVED,
        occurredAt: new Date(),
        notes:      'Colis réceptionné en agence.',
      }, { transaction: t })

      await Notification.create({
        parcelId:       parcel.id,
        userId:         sender.id,
        recipientEmail: sender.email,
        channel:        NOTIF_CHANNEL.EMAIL,
        type:           NOTIF_TYPE.STATUS_UPDATE,
        status:         NOTIF_STATUS.PENDING,
      }, { transaction: t })

      // 3c. Poids du sac si applicable
      if (bag) {
        await recalculateBagWeight(bag, t)
      }

      // 3d. Facture
      invoice = await Invoice.create({
        number:         invoiceService.generateInvoiceNumber(),
        parcelId:       parcel.id,
        subtotal:       invoiceData.subtotal,
        taxRate:        body.taxRate ?? 0,
        total:          invoiceData.total,
        currency:       body.currency ?? 'EUR',
        notes:          body.notes,
        paymentMode:    body.paymentMode ?? 'recipient_full',
        paymentLocation: body.paymentLocation ?? null,
        paymentMethod:   body.paymentMethod ?? '',
        senderShare:    invoiceData.shares.senderShare,
        recipientShare: invoiceData.shares.recipientShare,
        senderPaid:     invoiceData.sPaid,
        recipientPaid:  invoiceData.rPaid,
        montantPaye:    invoiceData.montantPaye,
        status:         invoiceData.status,
      }, { transaction: t })
    })

    // ═══════════════════════════════════════════════════════════
    // 4. FINALISATION HORS TRANSACTION (non-bloquante)
    // ═══════════════════════════════════════════════════════════

    const warnings = []

    // 4a. QR code du colis
    try {
      await generateAndPersistParcelQRCode(parcel)
    } catch (qrErr) {
      console.error('Erreur QR code:', qrErr)
      warnings.push('QR code du colis non généré.')
    }

    // 4b. PDF de la facture
    try {
      await generateAndUploadInvoicePDF({
        invoice,
        parcel,
        sender,
        items:       body.items,
        montantPaye: invoiceData.montantPaye,
      })
    } catch (pdfErr) {
      console.error('Erreur PDF facture:', pdfErr)
      warnings.push('PDF de la facture non généré.')
    }

    // 4c. Email de réception (statut)
    await notifyParcelReceived({
      parcel,
      sender,
      bag,
      notes: 'Colis réceptionné en agence.',
    })

    // 4d. Email de bienvenue (si nouveau client)
    if (isNewSender && tempPassword) {
      try {
        await sendWelcomeEmail({
          to:                sender.email,
          name:              sender.name,
          temporaryPassword: tempPassword,
          loginUrl:          `${process.env.APP_URL}/login`,
        })
      } catch (welcomeErr) {
        console.error('Erreur email de bienvenue:', welcomeErr)
        warnings.push('Email de bienvenue non envoyé.')
      }
    }

    // ═══════════════════════════════════════════════════════════
    // 5. RÉPONSE
    // ═══════════════════════════════════════════════════════════

    const fullParcel = await Parcel.findByPk(parcel.id, { include: INCLUDE_FULL })
    const fullInvoice = await Invoice.findByPk(invoice.id, {
      include: [{
        association: 'parcel',
        include: [{ association: 'sender', attributes: ['id', 'name', 'email', 'phone'] }],
      }],
    })

    const plainInvoice = fullInvoice.toJSON()
    plainInvoice.pdfPublicUrl = fullInvoice.pdfUrl
      ? invoiceService.getInvoicePdfPublicUrl(fullInvoice.pdfUrl)
      : null

    res.status(201).json({
      parcel:  fullParcel,
      invoice: plainInvoice,
      warnings: warnings.length > 0 ? warnings : undefined,
      newClient: isNewSender
        ? { email: sender.email, temporaryPassword: tempPassword }
        : undefined,
    })
  } catch (err) { next(err) }
}

// ═══════════════════════════════════════════════════════════════
// UPDATE (PATCH / PUT)
// ═══════════════════════════════════════════════════════════════

/**
 * Met à jour les champs éditables d'un colis.
 * Recalcule le poids des sacs concernés si changement de bagId.
 */
const update = async (req, res, next) => {
  try {
    const {
      description, weight, recipientName, recipientPhone, recipientAddress,
      bagId, service, type, urgent, fragile,
    } = req.body

    const parcel = await Parcel.findByPk(req.params.id)
    if (!parcel) return res.status(404).json({ message: 'Colis introuvable.' })
    if (parcel.status === PARCEL_STATUS.COLLECTED) {
      return res.status(400).json({ message: 'Impossible de modifier un colis déjà collecté.' })
    }

    // Normaliser le bagId si présent dans le body
    let normalizedBagId = null
    const hasBagIdField = Object.prototype.hasOwnProperty.call(req.body, 'bagId')

    if (hasBagIdField) {
      normalizedBagId = bagId === '' ? null : bagId ?? null

      if (normalizedBagId) {
        const targetBag = await Bag.findByPk(normalizedBagId)
        if (!targetBag) {
          return res.status(404).json({ message: 'Sac introuvable.' })
        }
        if (targetBag.status !== 'ouvert') {
          return res.status(400).json({ message: 'Ce sac est fermé. Impossible de déplacer le colis.' })
        }
      }
    }

    const previousBagId = parcel.bagId

    await sequelize.transaction(async (t) => {
      await parcel.update({
        description,
        weight,
        recipientName,
        recipientPhone,
        recipientAddress,
        service:  service ?? parcel.service,
        type:     (type && PARCEL_TYPES.includes(type)) ? type : parcel.type,
        urgent:   urgent  ?? parcel.urgent,
        fragile:  fragile ?? parcel.fragile,
        ...(hasBagIdField ? { bagId: normalizedBagId } : {}),
      }, { transaction: t })

      // Recalculer le poids des sacs affectés (ancien + nouveau)
      if (hasBagIdField && previousBagId !== normalizedBagId) {
        const affectedBagIds = [previousBagId, normalizedBagId].filter(Boolean)
        for (const affectedBagId of affectedBagIds) {
          const affectedBag = await Bag.findByPk(affectedBagId, { transaction: t })
          if (affectedBag) {
            await recalculateBagWeight(affectedBag, t)
          }
        }
      }
    })

    res.json(await Parcel.findByPk(parcel.id, { include: INCLUDE_FULL }))
  } catch (err) { next(err) }
}

/**
 * Change le statut d'un colis avec règles métier :
 *   • Colis en sac : seules `issue` et `collected` (agent AF/admin) sont permises
 *   • Colis individuel : transitions autorisées par `allowedTransitions`
 *
 * Envoie un email et crée un TrackingEvent.
 */
const updateStatus = async (req, res, next) => {
  try {
    const { status, notes, location } = req.body

    const parcel = await Parcel.findByPk(req.params.id, {
      include: [
        { association: 'sender',  attributes: ['id', 'name', 'email', 'phone'] },
        { association: 'invoice' },
      ],
    })
    if (!parcel) return res.status(404).json({ message: 'Colis introuvable.' })

    // ── Détermination du prochain statut ──
    let nextStatus

    if (parcel.bagId) {
      const isIssueReport       = status === PARCEL_STATUS.ISSUE
      const isCollectionConfirm = status === PARCEL_STATUS.COLLECTED
        && parcel.status === PARCEL_STATUS.ARRIVED_DESTINATION
        && (req.user.role === ROLES.AGENT_AF || req.user.role === ROLES.ADMIN)

      if (!isIssueReport && !isCollectionConfirm) {
        return res.status(403).json({
          message: 'Les transitions de statut individuelles ne sont pas autorisées pour un colis en sac. Modifiez le statut via le sac (page Sacs).',
        })
      }
      nextStatus = isIssueReport ? PARCEL_STATUS.ISSUE : PARCEL_STATUS.COLLECTED
    } else {
      const allowedTransitions = {
        [PARCEL_STATUS.RECEIVED]:           [PARCEL_STATUS.DEPARTED_AIRPORT, PARCEL_STATUS.ISSUE],
        [PARCEL_STATUS.DEPARTED_AIRPORT]:   [PARCEL_STATUS.ARRIVED_DESTINATION, PARCEL_STATUS.ISSUE],
        [PARCEL_STATUS.ARRIVED_DESTINATION]:[PARCEL_STATUS.COLLECTED, PARCEL_STATUS.ISSUE],
        [PARCEL_STATUS.COLLECTED]:          [],
        [PARCEL_STATUS.ISSUE]:              [],
      }
      const allowed = allowedTransitions[parcel.status] || []
      if (!allowed.includes(status)) {
        return res.status(400).json({
          message: `Transition non autorisée de ${parcel.status} à ${status}.`,
        })
      }
      if (status === PARCEL_STATUS.COLLECTED && !['agent_af', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Seul un agent AF ou admin peut confirmer le retrait.' })
      }
      nextStatus = status
    }

    // ── Transaction : update + tracking + notification ──
    await sequelize.transaction(async (t) => {
      await parcel.update({ status: nextStatus }, { transaction: t })

      await TrackingEvent.create({
        parcelId:   parcel.id,
        agentId:    req.user.id,
        status:     nextStatus,
        location:   location ?? null,
        notes:      notes    ?? null,
        occurredAt: new Date(),
      }, { transaction: t })

      await Notification.create({
        parcelId:       parcel.id,
        userId:         parcel.senderId,
        recipientEmail: parcel.sender?.email ?? null,
        channel:        NOTIF_CHANNEL.EMAIL,
        type:           NOTIF_TYPE.STATUS_UPDATE,
        status:         NOTIF_STATUS.PENDING,
      }, { transaction: t })
    })

    // ── Email de statut (hors transaction) ──
    // Pour un colis en sac, on n'a pas besoin des agences fixes
    const bag = parcel.bagId ? await Bag.findByPk(parcel.bagId) : null
    const { originAgency, destinationAgency } = await resolveAgenciesForEmail(
      // On ne passe le sac QUE si le colis y est rattaché
      bag ? bag : null
    )

    try {
      await sendStatusEmail({
        to:            parcel.sender.email,
        parcelCode:    parcel.qrcode,
        status:        nextStatus,
        recipientName: parcel.recipientName,
        senderName:    parcel.sender.name,
        type:          parcel.type,
        notes:         notes || '',
        date:          new Date(),
        origin: originAgency
          ? { city: originAgency.city, adresse: originAgency.address, phone: originAgency.phone }
          : null,
        destination: destinationAgency
          ? { city: destinationAgency.city, adresse: destinationAgency.address, phone: destinationAgency.phone }
          : null,
        colis: {
          weight: parcel.weight,
          description: parcel.description,
          type: parcel.type,
        },
      })
      await Notification.update(
        { status: NOTIF_STATUS.SENT, sentAt: new Date() },
        {
          where: {
            parcelId: parcel.id,
            userId:   parcel.senderId,
            type:     NOTIF_TYPE.STATUS_UPDATE,
          },
        }
      )
    } catch (emailErr) {
      await Notification.update(
        { status: NOTIF_STATUS.FAILED, errorMessage: emailErr.message },
        {
          where: {
            parcelId: parcel.id,
            userId:   parcel.senderId,
            type:     NOTIF_TYPE.STATUS_UPDATE,
          },
        }
      )
    }

    res.status(201).json(
      await Parcel.findByPk(parcel.id, { include: INCLUDE_FULL })
    )
  } catch (err) { next(err) }
}

// ═══════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════

/**
 * Suppression d'un colis.
 * Refuse si le colis a déjà été collecté.
 * Supprime également le QR code du storage.
 */
const deleteParcel = async (req, res, next) => {
  try {
    const parcel = await Parcel.findByPk(req.params.id)
    if (!parcel) return res.status(404).json({ message: 'Colis introuvable.' })
    if (parcel.status === PARCEL_STATUS.COLLECTED) {
      return res.status(400).json({ message: 'Impossible de supprimer un colis déjà collecté.' })
    }

    await parcel.destroy()
    await deleteQRCode(parcel.qrcode)

    res.json({ message: 'Colis supprimé avec succès.' })
  } catch (err) { next(err) }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // READ
  getAll,
  getById,
  trackByQRCode,
  getQRCode,
  getDailyHistory,

  // CREATE
  create,
  createWithInvoice,

  // UPDATE
  update,
  updateStatus,

  // DELETE
  deleteParcel,
}