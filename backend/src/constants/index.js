// src/constants/index.js
const ROLES = {
  CLIENT:   'client',
  AGENT_FR: 'agent_fr',
  AGENT_AF: 'agent_af',
  ADMIN:    'admin',
}

const PARCEL_STATUS = {
  RECEIVED:             'received',
  DEPARTED_AGENCY:      'departed_agency',
  DEPARTED_AIRPORT:     'departed_airport',
  ARRIVED_DESTINATION:  'arrived_destination',
  COLLECTED:            'collected',
  ISSUE:                'issue',
}

const BAG_STATUS = {
  OPEN:       'open',
  CLOSED:     'closed',
  IN_TRANSIT: 'in_transit',
  ARRIVED:    'arrived',
  ISSUE:      'issue',
}

const SHIPMENT_STATUS = {
  PREPARING:  'preparing',
  IN_TRANSIT: 'in_transit',
  ARRIVED:    'arrived',
  ISSUE:      'issue',
}

const NOTIF_CHANNEL = { EMAIL: 'email', SMS: 'sms' }
const NOTIF_TYPE    = { STATUS_UPDATE: 'status_update', ISSUE: 'issue', BULK_ALERT: 'bulk_alert' }
const NOTIF_STATUS  = { PENDING: 'pending', SENT: 'sent', FAILED: 'failed' }

// Transitions autorisées par rôle
const ALLOWED_TRANSITIONS = {
  [ROLES.AGENT_FR]: {
    [PARCEL_STATUS.RECEIVED]:        PARCEL_STATUS.DEPARTED_AGENCY,
    [PARCEL_STATUS.DEPARTED_AGENCY]: PARCEL_STATUS.DEPARTED_AIRPORT,
  },
  [ROLES.AGENT_AF]: {
    [PARCEL_STATUS.DEPARTED_AIRPORT]:    PARCEL_STATUS.ARRIVED_DESTINATION,
    [PARCEL_STATUS.ARRIVED_DESTINATION]: PARCEL_STATUS.COLLECTED,
  },
  [ROLES.ADMIN]: {
    [PARCEL_STATUS.RECEIVED]:            PARCEL_STATUS.DEPARTED_AGENCY,
    [PARCEL_STATUS.DEPARTED_AGENCY]:     PARCEL_STATUS.DEPARTED_AIRPORT,
    [PARCEL_STATUS.DEPARTED_AIRPORT]:    PARCEL_STATUS.ARRIVED_DESTINATION,
    [PARCEL_STATUS.ARRIVED_DESTINATION]: PARCEL_STATUS.COLLECTED,
  },
}

function canTransition(currentStatus, role) {
  return ALLOWED_TRANSITIONS[role]?.[currentStatus] ?? null
}

module.exports = {
  ROLES,
  PARCEL_STATUS,
  BAG_STATUS,
  SHIPMENT_STATUS,
  NOTIF_CHANNEL,
  NOTIF_TYPE,
  NOTIF_STATUS,
  ALLOWED_TRANSITIONS,
  canTransition,
}