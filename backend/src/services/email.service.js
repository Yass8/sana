// src/services/email.service.js
const nodemailer = require('nodemailer');
const { statusUpdateTemplate, bulkAlertTemplate, STATUS_CONFIG, resetPasswordTemplate, welcomeTemplate, bulkCustomMessageTemplate } = require('./email.templates');

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


/**
 * Envoi de l'email de réinitialisation de mot de passe
 */
async function sendResetEmail(params) {
  const html = resetPasswordTemplate(params);

  const mailOptions = {
    from: `"SanaService" <${process.env.GMAIL_USER}>`,
    to: params.to,
    subject: `🔐 Réinitialisation de votre mot de passe — SanaService`,
    html: html,
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
 * (fonction à appeler depuis le controller user.controller.js après la création d'un utilisateur)
 */
async function sendWelcomeEmail(params) {
  const html = welcomeTemplate(params);
  const mailOptions = {
    from: `"SanaService" <${process.env.GMAIL_USER}>`,
    to: params.to,
    subject: `🎉 Bienvenue chez SanaService, ${params.name} !`,
    html: html,
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

  const mailOptions = {
    from: `"SanaService" <${process.env.GMAIL_USER}>`,
    to,
    subject: `📬 Message de SanaService`,
    html,
  };

  return await transporter.sendMail(mailOptions);
}

module.exports = { sendStatusEmail, sendBulkAlertEmail, sendResetEmail, sendWelcomeEmail, sendBulkCustomEmail };