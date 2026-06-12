// src/services/email.service.js
const nodemailer = require('nodemailer');
const {
  statusUpdateTemplate,
  statusUpdateText,
  bulkAlertTemplate,
  bulkAlertText,
  resetPasswordTemplate,
  resetPasswordText,
  welcomeTemplate,
  welcomeText,
  bulkCustomMessageTemplate,
  bulkCustomMessageText,
  STATUS_CONFIG
} = require('./email.templates');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';

// Expéditeur et adresse de réponse (utilise la même adresse Gmail, modifiable à souhait)
const FROM_ADDRESS = `"SanaService" <${process.env.GMAIL_USER}>`;
const REPLY_TO = `"Service client SanaService" <${process.env.GMAIL_USER}>`;

/**
 * Envoi de statut
 */
async function sendStatusEmail(params) {
  const trackingUrl = `${APP_URL}/track/${params.parcelCode}`;
  const config = STATUS_CONFIG[params.status] || STATUS_CONFIG.received;

  const html = statusUpdateTemplate({ ...params, trackingUrl });
  const text = statusUpdateText({ ...params, trackingUrl });

  const mailOptions = {
    from: FROM_ADDRESS,
    to: params.to,
    replyTo: REPLY_TO,
    subject: `📦 ${params.parcelCode} : ${config.label}`,
    text: text,
    html: html,
    headers: {
      'List-Unsubscribe': `<mailto:${process.env.GMAIL_USER}?subject=unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    }
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
  const text = bulkAlertText({ ...params, trackingUrl });

  const mailOptions = {
    from: FROM_ADDRESS,
    to: params.to,
    replyTo: REPLY_TO,
    subject: `⚠️ Information importante — ${params.parcelCode}`,
    text: text,
    html: html,
    headers: {
      'List-Unsubscribe': `<mailto:${process.env.GMAIL_USER}?subject=unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    }
  };

  return await transporter.sendMail(mailOptions);
}

/**
 * Envoi de l'email de réinitialisation de mot de passe
 */
async function sendResetEmail(params) {
  const html = resetPasswordTemplate(params);
  const text = resetPasswordText(params);

  const mailOptions = {
    from: FROM_ADDRESS,
    to: params.to,
    replyTo: REPLY_TO,
    subject: `🔐 Réinitialisation de votre mot de passe — SanaService`,
    text: text,
    html: html,
    headers: {
      'List-Unsubscribe': `<mailto:${process.env.GMAIL_USER}?subject=unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    }
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error("Erreur Nodemailer (reset):", error);
    throw new Error("Échec de l'envoi de l'email");
  }
}

/**
 * Envoi de l'email de bienvenue lors de la création d'un nouvel utilisateur
 */
async function sendWelcomeEmail(params) {
  const html = welcomeTemplate(params);
  const text = welcomeText(params);

  const mailOptions = {
    from: FROM_ADDRESS,
    to: params.to,
    replyTo: REPLY_TO,
    subject: `🎉 Bienvenue chez SanaService, ${params.name} !`,
    text: text,
    html: html,
    headers: {
      'List-Unsubscribe': `<mailto:${process.env.GMAIL_USER}?subject=unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    }
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error("Erreur Nodemailer (welcome):", error);
    throw new Error("Échec de l'envoi de l'email de bienvenue");
  }
}

/**
 * Envoi d'un message groupé personnalisé (depuis la page utilisateurs)
 */
async function sendBulkCustomEmail({ to, name, message }) {
  const html = bulkCustomMessageTemplate({ name, message });
  const text = bulkCustomMessageText({ name, message });

  const mailOptions = {
    from: FROM_ADDRESS,
    to,
    replyTo: REPLY_TO,
    subject: `📬 Message de SanaService`,
    text: text,
    html: html,
    headers: {
      'List-Unsubscribe': `<mailto:${process.env.GMAIL_USER}?subject=unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    }
  };

  return await transporter.sendMail(mailOptions);
}

module.exports = { sendStatusEmail, sendBulkAlertEmail, sendResetEmail, sendWelcomeEmail, sendBulkCustomEmail };