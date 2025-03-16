const express = require('express');

const patientController = require('../controllers/patientController');
const authController = require('../controllers/authController');
const profilePhotoRouter = require('./profilePhotoRoutes');

const router = express.Router();

router.post('/signup', authController.patientSignup);
router.post('/login', authController.patientLogin);
router.get('/logout', authController.protect, authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

router.use(authController.protect);
router.use(authController.patientRestriction);

router.patch('/updatePersonalDetails', patientController.updatePersonalDetails);

router.patch('/updatePassword', authController.updatePassword);

router.use('/profilePhoto', profilePhotoRouter);

router.get('/me', patientController.getMe);

router.get('/viewDoctor/:id', patientController.viewDoctor);
router.get('/viewAllDoctors', patientController.viewAllDoctors);

router.get('/viewClinic/:id', patientController.viewClinic);
router.get('/viewAllClinics', patientController.viewAllClinics);

module.exports = router;
