const express = require('express');

const referralController = require('../controllers/referralController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect, authController.patientRestriction);

router.post(
  '/createReferral',
  referralController.createReferralToken,
  referralController.checkValidInvite,
  referralController.invitePatient
);

module.exports = router;
