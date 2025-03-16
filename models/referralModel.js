const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
    },
    referredPatient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    claimedByReferrer: {
      type: Boolean,
      default: false,
    },
    claimedByReferredPatient: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

const Referral = mongoose.model('Referral', referralSchema);
module.exports = Referral;
