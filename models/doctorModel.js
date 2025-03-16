const mongoose = require('mongoose');
const validator = require('validator');
const { applyCommonHooks } = require('../utils/schemaMethods');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please tell us your name!'],
      trime: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      trim: true,
      minLength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password'],
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: 'Passwords do not match',
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
    role: {
      type: String,
      enum: ['patient', 'doctor'],
      default: 'doctor',
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
    specialization: {
      type: String,
      trim: true,
    },
    experience: {
      type: Number,
    },
    qualifications: {
      type: [String],
      minLength: 1,
    },
    documents: {
      type: [String],
      minLength: 1,
    },
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      select: false,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
      select: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  {
    versionKey: false,
  }
);

doctorSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

doctorSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

applyCommonHooks(doctorSchema);

const Doctor = mongoose.model('Doctor', doctorSchema);
module.exports = Doctor;
