const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
    },
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    appointmentFee: {
      type: Number,
    },
    appointmentDate: {
      type: Date,
      required: [true, 'Please provide an appointment date'],
    },
    startTime: {
      type: String,
      required: [true, 'Please provide a start time'],
    },
    endTime: {
      type: String,
    },
    consultationType: {
      type: String,
      enum: ['online', 'offline'],
      required: [true, 'Please provide a consultation type'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'successful', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentIntentId: {
      type: String,
    },
    paymentMethodId: {
      type: String,
    },
    rating: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rating',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      select: false,
    },
    updatedAt: {
      type: Date,
      select: false,
    },
  },
  {
    versionKey: false,
  }
);

appointmentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

appointmentSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

const Appointment = mongoose.model('Appointment', appointmentSchema);
module.exports = Appointment;
