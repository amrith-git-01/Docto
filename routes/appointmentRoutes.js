const express = require('express');
const appointmentController = require('../controllers/appointmentController');
const authController = require('../controllers/authController');
const paymentController = require('../controllers/paymentController');
const ratingController = require('../controllers/ratingController');
const commentController = require('../controllers/commentController');

const router = express.Router();

router.use(authController.protect);
router.use(authController.patientRestriction);

router.post('/book/:clinicId', appointmentController.bookAppointment);

router.post(
  '/initiatePayment/:id',
  paymentController.checkReferrals,
  paymentController.initiatePayment
);

router.post('/createPaymentMethod/:id', paymentController.createPaymentMethod);

router.post('/confirmPayment/:id', paymentController.confirmPayment);

router.post('/cancel/:id', appointmentController.cancelAppointment);

router.post(
  '/createRating/:id',
  ratingController.checkValidRatingCreation,
  ratingController.createRating
);

router.patch(
  '/updateRating/:id',
  ratingController.checkValidRatingUpdationAndDeletion,
  ratingController.updateRating
);

router.delete(
  '/deleteRating/:id',
  ratingController.checkValidRatingUpdationAndDeletion,
  ratingController.deleteRating
);

router.post(
  '/createComment/:id',
  commentController.validCommentCreation,
  commentController.createComment
);

router.patch(
  '/updateComment/:id',
  commentController.checkValidCommentUpdationAndDeletion,
  commentController.updateComment
);

router.delete(
  '/deleteComment/:id',
  commentController.checkValidCommentUpdationAndDeletion,
  commentController.deleteComment
);

module.exports = router;
