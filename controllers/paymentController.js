const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Appointment = require('../models/appointmentModel');
const Email = require('../services/email');
const Patient = require('../models/patientModel');
const Referral = require('../models/referralModel');
const stripe = require('stripe')(process.env.STRIPE_API_KEY);

exports.initiatePayment = catchAsync(async (req, res, next) => {
  const appointmentId = req.params.id;
  const appointment = await Appointment.findById(appointmentId);

  if (appointment.paymentStatus === 'successful') {
    return next(new AppError('Appointment already confirmed', 400));
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: appointment.appointmentFee * 100,
    currency: 'inr',
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'never',
    },
    metadata: {
      appointmentId: appointment.id,
    },
  });

  appointment.paymentIntentId = paymentIntent.id;
  await appointment.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Payment initiated successfully',
  });
});

exports.checkReferrals = catchAsync(async (req, res, next) => {
  const appointmentId = req.params.id;

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return next(new AppError('Appointment not found', 404));
  }

  let referrals = await Referral.find({
    referredPatient: req.user.id,
    claimedByReferredPatient: false,
  });

  if (referrals.length > 0) {
    const referral = referrals[0];
    await Referral.findByIdAndUpdate(
      referral.id,
      { claimedByReferredPatient: true },
      { new: true, runValidators: true }
    );
    appointment.appointmentFee =
      appointment.appointmentFee - appointment.appointmentFee * 0.2;
    await appointment.save({ validateBeforeSave: false });

    return next();
  }
  referrals = await Referral.find({
    patient: req.user.id,
    claimedByReferrer: false,
  });

  if (referrals.length > 0) {
    const referral = referrals[0];
    await Referral.findByIdAndUpdate(
      referral.id,
      { claimedByReferrer: true },
      { new: true, runValidators: true }
    );
    appointment.appointmentFee =
      appointment.appointmentFee - appointment.appointmentFee * 0.2;
    await appointment.save({ validateBeforeSave: false });

    return next();
  }
  next();
});

exports.createPaymentMethod = catchAsync(async (req, res, next) => {
  try {
    const appointmentId = req.params.id;
    if (!appointmentId) return next(new AppError('Appointment not found', 404));
    const appointment = Appointment.findById(appointmentId);
    if (!appointment) {
      return next(new AppError('No appointment found with that ID!', 404));
    }
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: process.env.STRIPE_TOKEN,
      },
    });

    if (!paymentMethod) {
      return next(new AppError('Payment method creation failed', 400));
    }

    await Appointment.findByIdAndUpdate(appointmentId, {
      paymentMethodId: paymentMethod.id,
    });

    res.status(200).json({
      status: 'success',
      message: 'Payment method created successfully',
      paymentMethodId: paymentMethod.id,
      paymentMethodDetails: paymentMethod,
    });
  } catch (err) {
    console.log('Error in createPaymentMethod:', err.message);
  }
});

exports.confirmPayment = catchAsync(async (req, res, next) => {
  try {
    const appointmentId = req.params.id;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return next(new AppError('Appointment not found', 404));

    const paymentIntent = await stripe.paymentIntents.confirm(
      appointment.paymentIntentId,
      {
        payment_method: appointment.paymentMethodId,
      }
    );

    if (paymentIntent.status === 'succeeded') {
      // Update appointment status
      appointment.status = 'confirmed';
      appointment.paymentStatus = 'successful';
      await appointment.save();

      const bookingURL = `${req.protocol}://${req.get(
        'host'
      )}/api/v1/appointments/${appointment.id}`;

      const patient = await Patient.findById(appointment.patient);

      await new Email(patient, bookingURL, appointment).sendConfirmation();

      res.status(200).json({
        status: 'success',
        message: 'Payment confirmed. Appointment successfully booked.',
        appointment,
      });
    } else {
      return next(
        new AppError('Payment not successful. Please try again.', 400)
      );
    }
  } catch (err) {
    console.log('Error in confirmPayment:', err);
    return next(
      new AppError('Something went wrong while confirming payment.', 500)
    );
  }
});
