const express = require('express');
const clinicController = require('../controllers/clinicController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect, authController.doctorRestriction);

router.post('/addClinic', clinicController.addClinic);

router.patch('/updateClinic', clinicController.updateClinic);

router.get('/viewClinicDetails', clinicController.viewClinicDetails);

module.exports = router;
