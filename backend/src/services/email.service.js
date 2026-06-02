// src/services/email.service.js
const nodemailer = require('nodemailer');
const { statusUpdateTemplate, bulkAlertTemplate, STATUS_CONFIG } = require('./email.templates');

// Configuration du transporteur Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';

/**
 * Envoi de statut
 */
async function sendStatusEmail(params) {
  
  const trackingUrl = `${APP_URL}/track/${params.parcelCode}`;
  const config = STATUS_CONFIG[params.status] || STATUS_CONFIG.received;
  
  const html = statusUpdateTemplate({ ...params, trackingUrl });

  const mailOptions = {
    from: `"SanaService" <${process.env.GMAIL_USER}>`,
    to: params.to,
    subject: `📦 ${params.parcelCode} : ${config.label}`,
    html: html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error("Erreur Nodemailer:", error);
    throw new Error("Échec de l'envoi de l'email");
  }
}

/**
 * Envoi d'alerte groupée
 */
async function sendBulkAlertEmail(params) {
  const trackingUrl = `${APP_URL}/track/${params.parcelCode}`;
  const html = bulkAlertTemplate({ ...params, trackingUrl });

  const mailOptions = {
    from: `"SanaService" <${process.env.GMAIL_USER}>`,
    to: params.to,
    subject: `⚠️ Information importante — ${params.parcelCode}`,
    html: html,
  };

  return await transporter.sendMail(mailOptions);
}

module.exports = { sendStatusEmail, sendBulkAlertEmail };