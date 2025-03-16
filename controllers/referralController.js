const Referral = require('../models/referralModel');
const Patient = require('../models/patientModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../services/email');
const { generateReferralCode } = require('../utils/generateReferralCode');

exports.createReferralToken = catchAsync(async (req, res, next) => {
  const referral = await Referral.create({
    patient: req.user.id,
    code: generateReferralCode(),
  });
  if (!referral) {
    return next(new AppError('Failed to create referral token', 400));
  }
  req.body.referralCode = referral.code;
  next();
});

exports.invitePatient = catchAsync(async (req, res, next) => {
  const { patientEmail, patientName } = req.body;
  const patientObj = {
    name: patientName,
    email: patientEmail,
  };
  const email = new Email(patientObj);
  await email.sendPatientInvite(req.body.referralCode);

  res.status(200).json({
    status: 'success',
    message: 'Successfully invited patient',
  });
});

exports.checkValidInvite = catchAsync(async (req, res, next) => {
  const { patientName, patientEmail } = req.body;
  if (!patientEmail || !patientName) {
    return next(new AppError('Please provide the necessary details!', 400));
  }
  const patient = await Patient.findOne({ email: patientEmail });
  if (patient) {
    return next(new AppError('Patient already exists!', 400));
  }
  const referral = await Referral.findOne({
    patient: req.user.id,
    code: req.body.referralCode,
  });
  if (referral.referredPatient) {
    return next(new AppError('Patient has already been referred!', 400));
  }
  next();
});
