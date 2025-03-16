const mongoose = require('mongoose');
const validator = require('validator');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const { applyCommonHooks } = require('../utils/schemaMethods');

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please tell us your name!'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide your email!'],
      trim: true,
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email!'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      trim: true,
      select: false,
      minLength: [8, 'Password must be at least 8 characters'],
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password'],
      trim: true,
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: 'Passwords are not the same!',
      },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female'],
      trime: true,
    },
    dob: {
      type: Date,
    },
    phone: {
      type: String,
      minLength: 10,
      maxLength: 10,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    profile: {
      type: String,
    },
    role: {
      type: String,
      enum: ['patient', 'doctor'],
      default: 'patient',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      select: false,
    },
    updatedAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: true,
    },
  },
  {
    versionKey: false,
  }
);

applyCommonHooks(patientSchema);

patientSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

patientSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const Patient = mongoose.model('Patient', patientSchema);
module.exports = Patient;
