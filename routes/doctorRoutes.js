const express = require('express');

const doctorController = require('../controllers/doctorController');
const authController = require('../controllers/authController');
const profilePhotoRouter = require('./profilePhotoRoutes');

const router = express.Router();

router.post('/signup', authController.doctorSignup);
router.post('/login', authController.doctorLogin);
router.get('/logout', authController.protect, authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

router.use(authController.protect);
router.use(authController.doctorRestriction);

router.patch('/updatePersonalDetails', doctorController.updatePersonalDetails);

router.patch('/updatePassword', authController.updatePassword);

router.use('/profilePhoto', profilePhotoRouter);

router.post('/uploadDocuments', doctorController.uploadDocuments);

router.get('/me', doctorController.getMe);

router.get('/viewAppointments', doctorController.viewAppointments);

router.get('/viewAllAppointments', doctorController.viewAllAppointments);

module.exports = router;
