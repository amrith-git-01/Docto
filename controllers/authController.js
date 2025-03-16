const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Email = require('../services/email');

const Patient = require('../models/patientModel');
const Doctor = require('../models/doctorModel');
const Referral = require('../models/referralModel');

const { createSendToken } = require('../utils/token');

exports.patientSignup = catchAsync(async (req, res, next) => {
  try {
    const newPatient = await Patient.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
    });

    if (!newPatient) {
      return next(new AppError('Failed to create patient', 400));
    }

    const { code } = req.body;
    if (code) {
      const referral = await Referral.findOne({ code: code });
      if (!referral) {
        return next(new AppError('Invalid referral code', 400));
      }
      referral.referredPatient = newPatient._id;
      await referral.save({ validateBeforeSave: false });
    }

    const url = `${req.protocol}://${req.get('host')}/me`;

    await new Email(newPatient, url).sendWelcome();

    createSendToken(newPatient, 201, res);
  } catch (err) {
    console.log(err);
  }
});

exports.doctorSignup = catchAsync(async (req, res, next) => {
  const newDoctor = await Doctor.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newDoctor, url).sendWelcome();

  createSendToken(newDoctor, 201, res);
});

exports.patientLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  const patient = await Patient.findOne({ email }).select('+password');

  if (
    !patient ||
    !(await patient.correctPassword(password, patient.password))
  ) {
    return next(new AppError('Incorrect email or password', 401));
  }
  patient.active = true;
  await patient.save({ validateBeforeSave: false });

  createSendToken(patient, 200, res);
});

exports.doctorLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  const doctor = await Doctor.findOne({ email }).select('+password');

  if (!doctor || !(await doctor.correctPassword(password, doctor.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  doctor.active = true;
  await doctor.save({ validateBeforeSave: false });
  createSendToken(doctor, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  let user;
  if (decoded.role === 'patient') {
    user = await Patient.findById(decoded.id);
  } else if (decoded.role === 'doctor') {
    user = await Doctor.findById(decoded.id);
  }

  if (!user) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  if (user.active === false) {
    return next(
      new AppError(
        'Your account has not logged in. Please log in to get access.',
        401
      )
    );
  }

  if (user.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }

  req.user = user;

  next();
});

exports.logout = catchAsync(async (req, res, next) => {
  const user = req.user;

  if (!user) {
    return next(new AppError('User not found!', 401));
  }

  user.active = false;
  await user.save({ validateBeforeSave: false });

  res.cookie('jwt', 'loggedout', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(Date.now() + 10 * 1000),
  });

  res.status(200).json({
    status: 'success',
    message: 'Successfully logged out',
  });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new AppError('Please provide your email', 400));
  }
  let user = req.user;
  if (user.role === 'patient') {
    user = await Patient.findOne({ email });
  } else {
    user = await Doctor.findOne({ email });
  }

  if (!user) {
    return next(
      new AppError('There is no patient with that email address.', 401)
    );
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  try {
    const resetUrl = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/patients/resetPassword/${resetToken}`;
    await new Email(user, resetUrl).sendPasswordReset();
  } catch (err) {
    userPasswordResetToken = undefined;
    userPasswordResetExpires = undefined;
    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
  res.status(200).json({
    status: 'success',
    message: 'Password reset token sent to your email',
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  let user = req.user;
  if (user.role === 'patient') {
    user = await Patient.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });
  } else {
    user = await Doctor.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });
  }

  if (!user) {
    return next(new AppError('Invalid token or token has expired', 400));
  }

  const { password, passwordConfirm } = req.body;

  if (!password || !passwordConfirm) {
    return next(
      new AppError('Please provide both password and confirm password', 400)
    );
  }

  if (password !== passwordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = Date.now();

  await user.save();

  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  if (req.body.password !== req.body.passwordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }

  let user;
  if (req.user.role === 'patient') {
    user = await Patient.findById(req.user.id).select('+password');
  } else if (req.user.role === 'doctor') {
    user = await Doctor.findById(req.user.id).select('+password');
  }

  if (!user) {
    return next(new AppError('You do not have an account', 401));
  }

  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save();

  createSendToken(user, 200, res);
});

exports.doctorRestriction = catchAsync(async (req, res, next) => {
  if (req.user.role === 'patient') {
    return next(
      new AppError('You do not have permission to perform this action', 403)
    );
  }
  next();
});

exports.patientRestriction = catchAsync(async (req, res, next) => {
  if (req.user.role === 'doctor') {
    return next(
      new AppError('You do not have permission to perform this action', 403)
    );
  }
  next();
});
