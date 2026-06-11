// src/services/email.templates.js

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';

/* ─────────────────────────────────────────
   CONFIGURATION DES STATUTS
   ───────────────────────────────────────── */
const STATUS_CONFIG = {
  received: {
    label: 'Votre colis a été réceptionné',
    color: '#7C3AED',
    bg: '#F3E8FF',
    iconBg: '#EDE9FE',
    icon: '📦'
  },
  departed_airport: {
    label: 'Votre colis est en vol',
    color: '#4F46E5',
    bg: '#E0E7FF',
    iconBg: '#DBEAFE',
    icon: '✈️'
  },
  arrived_destination: {
    label: 'Votre colis est arrivé à destination',
    color: '#059669',
    bg: '#D1FAE5',
    iconBg: '#D1FAE5',
    icon: '📍'
  },
  collected: {
    label: 'Votre colis a été retiré',
    color: '#10B981',
    bg: '#D1FAE5',
    iconBg: '#D1FAE5',
    icon: '✅'
  },
  issue: {
    label: 'Un problème a été signalé',
    color: '#DC2626',
    bg: '#FEE2E2',
    iconBg: '#FEE2E2',
    icon: '⚠️'
  }
};

/* ─────────────────────────────────────────
   LAYOUT DE BASE
   ───────────────────────────────────────── */
const baseLayout = (content, headerTitle = 'SanaService') => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>SanaService</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background:#0A1628;padding:28px 32px;text-align:center;border-radius:20px 20px 0 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                    📬 SanaService
                  </td>
                </tr>
                <tr>
                  <td style="font-size:10px;font-weight:600;color:#94A3B8;letter-spacing:3px;text-transform:uppercase;padding-top:6px;">
                    Transport France — Afrique
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${content}
          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;padding:24px 32px;border-top:1px solid #E2E8F0;text-align:center;border-radius:0 0 20px 20px;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#64748B;font-weight:500;">SanaService · Votre partenaire logistique</p>
              <p style="margin:0;font-size:11px;color:#94A3B8;">Cet email a été généré automatiquement. Merci de ne pas y répondre.</p>
              <p style="margin:8px 0 0 0;font-size:10px;color:#CBD5E1;">
                <a href="${APP_URL}" style="color:#7C3AED;text-decoration:none;">sanaservice.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/* ─────────────────────────────────────────
   TEMPLATE : MISE À JOUR DE STATUT
   ───────────────────────────────────────── */
const statusUpdateTemplate = ({ parcelCode, status, recipientName, senderName, origin, destination, trackingUrl, notes, colis }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.received;

  // Bloc agence
  const agencyBlock = (label, agency) => {
    if (!agency) return '';
    const city = agency.city || '—';
    const address = agency.address || agency.adresse || '';
    const phone = agency.phone || '';
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:10px;">
        <tr>
          <td style="padding:12px 14px;background:#ffffff;border-radius:10px;border:1px solid #E2E8F0;">
            <p style="margin:0 0 4px 0;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;">${label}</p>
            <p style="margin:0;font-size:14px;font-weight:700;color:#0F172A;">${city}</p>
            ${address ? `<p style="margin:4px 0 0 0;font-size:12px;color:#64748B;line-height:1.4;">${address}</p>` : ''}
            ${phone ? `<p style="margin:2px 0 0 0;font-size:12px;color:#64748B;">${phone}</p>` : ''}
          </td>
        </tr>
      </table>
    `;
  };

  // Bloc informations colis
  const parcelInfoBlock = () => {
    if (!colis) return '';
    const weight = colis.weight ? `${colis.weight} kg` : null;
    const desc = colis.description;
    if (!weight && !desc) return '';
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px;">
        <tr>
          <td style="padding:12px 14px;background:#ffffff;border-radius:10px;border:1px solid #E2E8F0;">
            <p style="margin:0 0 6px 0;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;">Détails du colis</p>
            ${weight ? `<p style="margin:0 0 4px 0;font-size:13px;color:#0F172A;"><span style="color:#64748B;">Poids :</span> <strong>${weight}</strong></p>` : ''}
            ${desc ? `<p style="margin:0;font-size:13px;color:#0F172A;"><span style="color:#64748B;">Contenu :</span> ${desc}</p>` : ''}
          </td>
        </tr>
      </table>
    `;
  };

  const content = `
    <!-- Bannière de statut -->
    <tr>
      <td style="padding:24px 32px 0 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${cfg.bg};border-radius:12px;padding:16px;">
          <tr>
            <td width="48" valign="middle" style="background:${cfg.iconBg};border-radius:50%;width:40px;height:40px;text-align:center;">
              <span style="font-size:18px;">${cfg.icon}</span>
            </td>
            <td style="padding-left:14px;" valign="middle">
              <h1 style="margin:0;font-size:16px;font-weight:700;color:#0F172A;line-height:1.3;">${cfg.label}</h1>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Code de suivi -->
    <tr>
      <td style="padding:20px 32px 0 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0A1628;border-radius:12px;padding:16px;">
          <tr>
            <td>
              <p style="margin:0 0 4px 0;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;">Numéro de suivi</p>
              <p style="margin:0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:0.5px;font-family:monospace;">${parcelCode}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- QR Code -->
    <tr>
      <td style="padding:20px 32px 0 32px; text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr>
            <td style="padding:16px; background:#F8FAFC; border-radius:12px; border:1px solid #E2E8F0;">
              <img 
                src="${process.env.SUPABASE_URL}/storage/v1/object/public/qrcodes/${parcelCode}.png" 
                alt="QR Code" 
                width="140" 
                height="140" 
                style="display:block; margin:0 auto; border-radius:8px;"
              />
              <p style="margin:8px 0 0 0; font-size:12px; color:#64748B; font-weight:600;">
                QR Code à présenter lors du retrait de votre colis. 
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Détails de l'envoi -->
    <tr>
      <td style="padding:20px 32px 8px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="50%" style="padding-right:6px;">
              <p style="margin:0 0 2px 0;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;">Expéditeur</p>
              <p style="margin:0;font-size:14px;font-weight:600;color:#0F172A;">${senderName || '—'}</p>
            </td>
            <td width="50%" style="padding-left:6px;">
              <p style="margin:0 0 2px 0;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;">Destinataire</p>
              <p style="margin:0;font-size:14px;font-weight:600;color:#0F172A;">${recipientName || '—'}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Agences -->
    ${origin || destination ? `
    <tr>
      <td style="padding:8px 32px 8px 32px;">
        ${agencyBlock('Agence d\'origine', origin)}
        ${agencyBlock('Agence de destination', destination)}
      </td>
    </tr>
    ` : ''}

    <!-- Détails du colis -->
    ${colis ? `
    <tr>
      <td style="padding:4px 32px 8px 32px;">
        ${parcelInfoBlock()}
      </td>
    </tr>
    ` : ''}

    <!-- Note éventuelle -->
    ${notes ? `
    <tr>
      <td style="padding:8px 32px 8px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:12px;">
          <tr>
            <td style="padding:0 12px;">
              <p style="margin:0;font-size:13px;color:#92400E;line-height:1.5;"><strong>📝 Note :</strong> ${notes}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ` : ''}

    <!-- Bouton de suivi -->
    <tr>
      <td style="padding:24px 32px 32px 32px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr>
            <td style="background:#7C3AED;border-radius:30px;text-align:center;box-shadow:0 4px 6px rgba(124,58,237,0.2);">
              <a href="${trackingUrl}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:30px;">Suivre mon colis</a>
            </td>
          </tr>
        </table>
        <p style="margin:12px 0 0 0;font-size:11px;color:#94A3B8;">
          ou copiez ce lien :<br>
          <span style="color:#7C3AED;word-break:break-all;">${trackingUrl}</span>
        </p>
      </td>
    </tr>
  `;

  return baseLayout(content);
};

/* ─────────────────────────────────────────
   TEMPLATE : ALERTE GROUPÉE
   ───────────────────────────────────────── */
const bulkAlertTemplate = ({ recipientName, parcelCode, message, senderName, trackingUrl }) => {
  const content = `
    <tr>
      <td style="padding:24px 32px 0 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FEE2E2;border-radius:12px;padding:16px;">
          <tr>
            <td width="48" valign="middle" style="background:#FEE2E2;border-radius:50%;width:40px;height:40px;text-align:center;">
              <span style="font-size:18px;">⚠️</span>
            </td>
            <td style="padding-left:14px;" valign="middle">
              <h1 style="margin:0;font-size:16px;font-weight:700;color:#0F172A;">Information importante</h1>
              <p style="margin:4px 0 0 0;font-size:13px;color:#64748B;">Concernant votre colis <strong style="color:#0F172A;">${parcelCode}</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px 16px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:16px;">
          <tr>
            <td><p style="margin:0;font-size:14px;color:#92400E;line-height:1.6;font-weight:500;">${message}</p></td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 24px 32px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr>
            <td style="background:#0A1628;border-radius:30px;text-align:center;">
              <a href="${trackingUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:30px;">Voir les détails du colis</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
  return baseLayout(content);
};

/* ─────────────────────────────────────────
   TEMPLATE : RÉINITIALISATION MOT DE PASSE
   ───────────────────────────────────────── */
const resetPasswordTemplate = ({ name, resetUrl }) => {
  const content = `
    <tr>
      <td style="padding:24px 32px 0 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#E0E7FF;border-radius:12px;padding:16px;">
          <tr>
            <td width="48" valign="middle" style="background:#DBEAFE;border-radius:50%;width:40px;height:40px;text-align:center;">
              <span style="font-size:18px;">🔑</span>
            </td>
            <td style="padding-left:14px;" valign="middle">
              <h1 style="margin:0;font-size:16px;font-weight:700;color:#0F172A;">Réinitialisation de mot de passe</h1>
              <p style="margin:4px 0 0 0;font-size:13px;color:#64748B;">Bonjour <strong style="color:#0F172A;">${name || 'Madame, Monsieur'}</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px 24px 32px;">
        <p style="margin:0 0 16px 0;font-size:14px;color:#0F172A;line-height:1.6;">
          Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en définir un nouveau.
        </p>
        <p style="margin:0 0 20px 0;font-size:13px;color:#64748B;">
          Ce lien est valable <strong>1 heure</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr>
            <td style="background:#7C3AED;border-radius:30px;text-align:center;">
              <a href="${resetUrl}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:30px;">Réinitialiser mon mot de passe</a>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-size:11px;color:#94A3B8;text-align:center;">
          Si le bouton ne fonctionne pas :<br>
          <span style="color:#7C3AED;word-break:break-all;">${resetUrl}</span>
        </p>
      </td>
    </tr>
  `;
  return baseLayout(content);
};

/* ─────────────────────────────────────────
   TEMPLATE : BIENVENUE
   ───────────────────────────────────────── */
const welcomeTemplate = ({ name, to, temporaryPassword, loginUrl }) => {
  const content = `
    <tr>
      <td style="padding:24px 32px 0 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F3E8FF;border-radius:12px;padding:16px;">
          <tr>
            <td width="48" valign="middle" style="background:#EDE9FE;border-radius:50%;width:40px;height:40px;text-align:center;">
              <span style="font-size:18px;">👋</span>
            </td>
            <td style="padding-left:14px;" valign="middle">
              <h1 style="margin:0;font-size:16px;font-weight:700;color:#0F172A;">Bienvenue sur SanaService</h1>
              <p style="margin:4px 0 0 0;font-size:13px;color:#64748B;">Bonjour <strong style="color:#0F172A;">${name || 'Madame, Monsieur'}</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px 24px 32px;">
        <p style="margin:0 0 16px 0;font-size:14px;color:#0F172A;line-height:1.6;">
          Votre compte a été créé avec succès. Voici vos identifiants de connexion :
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8FAFC;border-radius:10px;padding:16px;margin-bottom:20px;">
          <tr>
            <td>
              <p style="margin:0 0 8px 0;font-size:13px;color:#0F172A;"><strong>Email :</strong> ${to}</p>
              <p style="margin:0;font-size:13px;color:#0F172A;"><strong>Mot de passe temporaire :</strong> ${temporaryPassword}</p>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 20px 0;font-size:13px;color:#64748B;">Nous vous recommandons de changer ce mot de passe après votre première connexion.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr>
            <td style="background:#7C3AED;border-radius:30px;text-align:center;">
              <a href="${loginUrl}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:30px;">Accéder à mon compte</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
  return baseLayout(content);
};

/* ─────────────────────────────────────────
   TEMPLATE : MESSAGE PERSONNALISÉ GROUPÉ
   ───────────────────────────────────────── */
const bulkCustomMessageTemplate = ({ name, message }) => {
  const content = `
    <tr>
      <td style="padding:24px 32px 0 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F3E8FF;border-radius:12px;padding:16px;">
          <tr>
            <td width="48" valign="middle" style="background:#EDE9FE;border-radius:50%;width:40px;height:40px;text-align:center;">
              <span style="font-size:18px;">📬</span>
            </td>
            <td style="padding-left:14px;" valign="middle">
              <h1 style="margin:0;font-size:16px;font-weight:700;color:#0F172A;">Message de SanaService</h1>
              <p style="margin:4px 0 0 0;font-size:13px;color:#64748B;">Bonjour <strong style="color:#0F172A;">${name || 'Madame, Monsieur'}</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px 24px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px;">
          <tr>
            <td><p style="margin:0;font-size:14px;color:#0F172A;line-height:1.6;">${message}</p></td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 24px 32px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr>
            <td style="background:#7C3AED;border-radius:30px;text-align:center;">
              <a href="https://sanaservice.com" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:30px;">Accéder au site</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
  return baseLayout(content);
};

module.exports = { statusUpdateTemplate, bulkAlertTemplate, resetPasswordTemplate, welcomeTemplate, STATUS_CONFIG, bulkCustomMessageTemplate };