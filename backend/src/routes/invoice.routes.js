// src/routes/invoice.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/invoice.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../constants');

router.get('/',    authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getById);

router.post('/', ctrl.create);
// router.post('/',    authenticate, authorize(ROLES.ADMIN, ROLES.AGENT_FR, ROLES.AGENT_AF), ctrl.create);
router.patch('/:id',authenticate, authorize(ROLES.ADMIN, ROLES.AGENT_FR, ROLES.AGENT_AF), ctrl.update);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), ctrl.deleteInvoice);

module.exports = router;