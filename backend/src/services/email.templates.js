// src/services/email.templates.js

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';

// On utilise les icônes Lucide hébergées directement (version SVG)
const STATUS_CONFIG = {
  received: {
    label: 'Votre colis a été réceptionné',
    color: '#7C3AED',
    icon: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/package.svg'
  },
  departed_agency: {
    label: "Votre colis a quitté l'agence",
    color: '#D97706',
    icon: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/building-2.svg'
  },
  departed_airport: {
    label: 'Votre colis est en vol',
    color: '#7C3AED',
    icon: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/plane-takeoff.svg'
  },
  arrived_destination: {
    label: 'Votre colis est arrivé à destination',
    color: '#059669',
    icon: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/map-pin.svg'
  },
  collected: {
    label: 'Votre colis a été retiré',
    color: '#10B981',
    icon: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/check-circle-2.svg'
  },
  issue: {
    label: 'Un problème a été signalé',
    color: '#EF4444',
    icon: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/alert-triangle.svg'
  }
};

/**
 * Layout de base pour tous les emails
 */
const baseLayout = (content) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <style>
    body { margin:0; padding:0; background:#F1F5F9; font-family:'Helvetica Neue',Arial,sans-serif; }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#0A1628;padding:32px 40px;">
              <p style="margin:0;color:#fff;font-size:22px;font-weight:700;">SanaService</p>
              <p style="margin:4px 0 0;color:#818CF8;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;">France — Afrique</p>
            </td>
          </tr>
          ${content}
          <tr>
            <td style="background:#F8FAFC;padding:24px 40px;border-top:1px solid #E2E8F0;">
              <p style="margin:0;color:#94A3B8;font-size:12px;text-align:center;">
                SanaService · Service de transport France — Afrique
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

/**
 * Template de mise à jour de statut
 */
const statusUpdateTemplate = ({ parcelCode, status, recipientName, senderName, destination, trackingUrl, notes }) => {
  
  console.log('🎨 Template - destination:', destination);
  
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.received;

  const content = `
    <tr>
      <td align="center" style="padding:40px 40px 0;">
        <img src="${config.icon}" width="48" height="48" style="display:block; color:${config.color};" alt="icon" />
        <h1 style="margin:20px 0 8px;color:#0F172A;font-size:22px;font-weight:700;">${config.label}</h1>
        <p style="margin:0;color:#64748B;font-size:15px;">Bonjour ${recipientName},</p>
      </td>
    </tr>

    <tr>
      <td style="padding:32px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:12px;padding:20px;">
          <tr>
            <td>
              <p style="margin:0;color:#94A3B8;font-size:11px;font-weight:600;text-transform:uppercase;">Code suivi</p>
              <p style="margin:4px 0 16px;color:#7C3AED;font-size:18px;font-weight:700;">${parcelCode}</p>
              
              <p style="margin:0;color:#94A3B8;font-size:11px;font-weight:600;text-transform:uppercase;">Expéditeur</p>
              <p style="margin:4px 0 0;color:#0F172A;font-size:15px;font-weight:600;">${senderName}</p>

              <p style="margin:0;color:#94A3B8;font-size:11px;font-weight:600;text-transform:uppercase;">Destination</p>
              <p style="margin:4px 0 0;color:#0F172A;font-size:15px;font-weight:600;">${destination}</p>
            </td>
          </tr>
        </table>
        ${notes ? `<div style="margin-top:16px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:16px;font-size:13px;color:#92400E;"><strong>Note :</strong> ${notes}</div>` : ''}
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:0 40px 40px;">
        <a href="${trackingUrl}" style="display:inline-block;background:#7C3AED;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:12px;">Suivre mon colis</a>
      </td>
    </tr>
  `;

  return baseLayout(content);
};

/**
 * Template pour les alertes importantes / Problèmes (Bulk)
 */
const bulkAlertTemplate = ({ recipientName, parcelCode, message, senderName, trackingUrl }) => {
  const content = `
    <tr>
      <td align="center" style="padding:40px 40px 0;">
        <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/alert-triangle.svg" 
             width="48" height="48" style="display:block; color:#D97706;" alt="Attention" />
        <h1 style="margin:20px 0 8px;color:#0F172A;font-size:22px;font-weight:700;">Information importante</h1>
      </td>
    </tr>

    <tr>
      <td style="padding:20px 40px 32px;">
        <div style="background:#FFF7ED; border:1px solid #FED7AA; border-radius:12px; padding:24px;">
          <p style="margin:0; color:#92400E; font-size:15px; line-height:1.6; font-weight:500;">
            ${message}
          </p>
        </div>
        
        <p style="margin:24px 0 0; color:#64748B; font-size:14px; text-align:center;">
          Bonjour <strong>${recipientName}</strong>, ce message concerne votre colis 
          <span style="color:#7C3AED; font-weight:700;">${parcelCode}</span> envoyé par ${senderName}.
        </p>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:0 40px 40px;">
        <a href="${trackingUrl}" 
           style="display:inline-block; background:#0A1628; color:#fff; text-decoration:none; 
                  font-size:15px; font-weight:700; padding:14px 32px; border-radius:12px;">
          Voir les détails du colis
        </a>
      </td>
    </tr>
  `;

  return baseLayout(content); // Utilise le même layout que l'email de statut
};

module.exports = { statusUpdateTemplate, bulkAlertTemplate, STATUS_CONFIG };