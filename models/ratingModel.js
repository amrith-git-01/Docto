const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
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

const Rating = mongoose.model('Rating', ratingSchema);
module.exports = Rating;
