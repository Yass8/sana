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
    initial: 'R'
  },
  departed_agency: {
    label: 'Votre colis a quitté l\'agence',
    color: '#D97706',
    bg: '#FEF3C7',
    initial: 'A'
  },
  departed_airport: {
    label: 'Votre colis est en vol',
    color: '#4F46E5',
    bg: '#E0E7FF',
    initial: 'V'
  },
  arrived_destination: {
    label: 'Votre colis est arrivé à destination',
    color: '#059669',
    bg: '#D1FAE5',
    initial: 'D'
  },
  collected: {
    label: 'Votre colis a été retiré',
    color: '#10B981',
    bg: '#D1FAE5',
    initial: 'T'
  },
  issue: {
    label: 'Un problème a été signalé',
    color: '#DC2626',
    bg: '#FEE2E2',
    initial: '!'
  }
};

/* ─────────────────────────────────────────
   LAYOUT DE BASE
   ───────────────────────────────────────── */
const baseLayout = (content) => `
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
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
          <tr>
            <td style="background:#0A1628;padding:28px 32px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr><td style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">SanaService</td></tr>
                <tr><td style="font-size:10px;font-weight:600;color:#818CF8;letter-spacing:3px;text-transform:uppercase;padding-top:4px;">France — Afrique</td></tr>
              </table>
            </td>
          </tr>
          ${content}
          <tr>
            <td style="background:#F8FAFC;padding:24px 32px;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;color:#64748B;">SanaService · Transport France — Afrique</p>
              <p style="margin:0;font-size:11px;color:#94A3B8;">Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
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

  const agencyBlock = (label, agency) => {
    if (!agency) return '';
    const city = agency.city || '—';
    const address = agency.address || agency.adresse;
    const phone = agency.phone;
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:10px;">
        <tr>
          <td style="padding:10px 14px;background:#ffffff;border-radius:8px;border:1px solid #E2E8F0;">
            <p style="margin:0 0 2px 0;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;">${label}</p>
            <p style="margin:0;font-size:14px;font-weight:700;color:#0F172A;">${city}</p>
            ${address ? `<p style="margin:2px 0 0 0;font-size:12px;color:#64748B;line-height:1.4;">${address}</p>` : ''}
            ${phone ? `<p style="margin:2px 0 0 0;font-size:12px;color:#64748B;">${phone}</p>` : ''}
          </td>
        </tr>
      </table>
    `;
  };

  const parcelInfo = () => {
    if (!colis) return '';
    const weight = colis.weight ? `${colis.weight} kg` : null;
    const desc = colis.description;
    if (!weight && !desc) return '';
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px;">
        <tr>
          <td style="padding:10px 14px;background:#ffffff;border-radius:8px;border:1px solid #E2E8F0;">
            <p style="margin:0 0 6px 0;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;">Informations du colis</p>
            ${weight ? `<p style="margin:0 0 2px 0;font-size:13px;color:#0F172A;"><span style="color:#64748B;">Poids :</span> <strong>${weight}</strong></p>` : ''}
            ${desc ? `<p style="margin:0;font-size:13px;color:#0F172A;"><span style="color:#64748B;">Description :</span> ${desc}</p>` : ''}
          </td>
        </tr>
      </table>
    `;
  };

  const content = `
    <!-- Status Header -->
    <tr>
      <td style="padding:32px 32px 0 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="48" valign="top">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:${cfg.bg};border-radius:50%;width:40px;height:40px;">
                <tr><td align="center" valign="middle" style="font-size:16px;font-weight:700;color:${cfg.color};font-family:Arial,sans-serif;">${cfg.initial}</td></tr>
              </table>
            </td>
            <td style="padding-left:14px;" valign="top">
              <h1 style="margin:0 0 4px 0;font-size:18px;font-weight:700;color:#0F172A;line-height:1.3;">${cfg.label}</h1>
              <p style="margin:0;font-size:14px;color:#64748B;">Bonjour <strong style="color:#0F172A;">${recipientName || 'Madame, Monsieur'}</strong>,</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Main Card -->
    <tr>
      <td style="padding:24px 32px 24px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8FAFC;border-radius:12px;padding:16px;">
          <tr>
            <td>
              <!-- Tracking Code -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:14px;">
                <tr>
                  <td style="padding:10px 14px;background:#0A1628;border-radius:8px;">
                    <p style="margin:0 0 2px 0;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;">Code de suivi</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">${parcelCode}</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="50%" style="padding-right:8px;">
                    <p style="margin:0 0 2px 0;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;">Expéditeur</p>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#0F172A;">${senderName || '—'}</p>
                  </td>
                  <td width="50%" style="padding-left:8px;">
                    <p style="margin:0 0 2px 0;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;">Destinataire</p>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#0F172A;">${recipientName || '—'}</p>
                  </td>
                </tr>
              </table>

              ${agencyBlock('Agence d\'origine', origin)}
              ${agencyBlock('Agence de destination', destination)}
              ${parcelInfo()}
            </td>
          </tr>
        </table>

        ${notes ? `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:14px;">
          <tr>
            <td style="padding:12px 14px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;">
              <p style="margin:0;font-size:12px;color:#92400E;line-height:1.5;"><strong>Note :</strong> ${notes}</p>
            </td>
          </tr>
        </table>
        ` : ''}
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td style="padding:0 32px 32px 32px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr>
            <td style="background:#7C3AED;border-radius:10px;text-align:center;">
              <a href="${trackingUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Suivre mon colis</a>
            </td>
          </tr>
        </table>
        <p style="margin:10px 0 0 0;font-size:11px;color:#94A3B8;">
          ${trackingUrl}
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
      <td style="padding:32px 32px 0 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="48" valign="top">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:#FEE2E2;border-radius:50%;width:40px;height:40px;">
                <tr><td align="center" valign="middle" style="font-size:16px;font-weight:700;color:#DC2626;font-family:Arial,sans-serif;">!</td></tr>
              </table>
            </td>
            <td style="padding-left:14px;" valign="top">
              <h1 style="margin:0 0 4px 0;font-size:18px;font-weight:700;color:#0F172A;line-height:1.3;">Information importante</h1>
              <p style="margin:0;font-size:14px;color:#64748B;">Concernant le colis <strong style="color:#0F172A;">${parcelCode}</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:24px 32px 24px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:16px;">
          <tr><td><p style="margin:0;font-size:14px;color:#92400E;line-height:1.6;font-weight:500;">${message}</p></td></tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:14px;">
          <tr>
            <td style="padding:12px 14px;background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0;">
              <p style="margin:0;font-size:13px;color:#0F172A;">Bonjour <strong>${recipientName || 'Madame, Monsieur'}</strong>, ce message concerne votre colis <span style="color:#7C3AED;font-weight:700;">${parcelCode}</span> envoyé par ${senderName || '—'}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:0 32px 32px 32px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr>
            <td style="background:#0A1628;border-radius:10px;text-align:center;">
              <a href="${trackingUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Voir les détails du colis</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  return baseLayout(content);
};

/* ─────────────────────────────────────────
   TEMPLATE : Reinitialisation de mot de passe (à implémenter)
   ───────────────────────────────────────── */
const resetPasswordTemplate = ({ name, resetUrl }) => {
  const content = `
    <tr>
      <td style="padding:32px 32px 0 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="48" valign="top">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:#E0E7FF;border-radius:50%;width:40px;height:40px;">
                <tr><td align="center" valign="middle" style="font-size:16px;font-weight:700;color:#4F46E5;font-family:Arial,sans-serif;">R</td></tr>
              </table>
            </td>
            <td style="padding-left:14px;" valign="top">
              <h1 style="margin:0 0 4px 0;font-size:18px;font-weight:700;color:#0F172A;line-height:1.3;">Réinitialisation de mot de passe</h1>
              <p style="margin:0;font-size:14px;color:#64748B;">Bonjour <strong style="color:#0F172A;">${name || 'Madame, Monsieur'}</strong>,</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:24px 32px 24px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8FAFC;border-radius:12px;padding:16px;">
          <tr>
            <td>
              <p style="margin:0 0 16px 0;font-size:14px;color:#0F172A;line-height:1.6;">
                Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
              </p>
              <p style="margin:0 0 16px 0;font-size:13px;color:#64748B;">
                Ce lien est valable pendant <strong>1 heure</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:0 32px 32px 32px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr>
            <td style="background:#7C3AED;border-radius:10px;text-align:center;">
              <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Réinitialiser mon mot de passe</a>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-size:11px;color:#94A3B8;">
          Si le bouton ne fonctionne pas, copiez ce lien :<br>
          <span style="color:#7C3AED;word-break:break-all;">${resetUrl}</span>
        </p>
      </td>
    </tr>
  `;

  return baseLayout(content);
};

/* ─────────────────────────────────────────
    TEMPLATES: email de bienvenue pour les nouveaux utilisateurs (à implémenter)
    ───────────────────────────────────────── */
const welcomeTemplate = ({ name, to, temporaryPassword, loginUrl }) => {
  const content = `
    <tr>
      <td style="padding:32px 32px 0 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="padding:0 0 16px 0;">
              <h1 style="margin:0;font-size:18px;font-weight:700;color:#0F172A;line-height:1.3;">Bienvenue sur notre plateforme</h1>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:24px 32px 24px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8FAFC;border-radius:12px;padding:16px;">
          <tr>
            <td>
              <p style="margin:0 0 16px 0;font-size:14px;color:#0F172A;line-height:1.6;">
                Bonjour <strong style="color:#0F172A;">${name || 'Madame, Monsieur'}</strong>,
              </p>
              <p style="margin:0 0 16px 0;font-size:14px;color:#0F172A;line-height:1.6;">
                Votre compte a été créé avec succès. Vous pouvez vous connecter à votre compte en utilisant les informations suivantes :
              </p>
              <p style="margin:0 0 16px 0;font-size:14px;color:#0F172A;line-height:1.6;">
                Email : <strong>${to}</strong><br>
                Mot de passe temporaire : <strong>${temporaryPassword}</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:0 32px 32px 32px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr>
            <td style="background:#7C3AED;border-radius:10px;text-align:center;">
              <a href="${loginUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Se connecter à mon compte</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  return baseLayout(content);
};

module.exports = { statusUpdateTemplate, bulkAlertTemplate, resetPasswordTemplate, welcomeTemplate, STATUS_CONFIG };