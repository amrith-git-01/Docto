const mongoose = require('mongoose');
const {
  getCoordinates,
  checkExistingClinic,
} = require('../services/geocoding');
const AppError = require('../utils/appError');

const clinicSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    clinicName: {
      type: String,
      required: [true, 'Please provide a clinic name'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
    },
    clinicAddress: {
      type: String,
      required: [true, 'Please provide a clinic address'],
    },
    contactNumber: {
      type: String,
      required: [true, 'Please provide a clinic phone'],
      match: [
        /^(\+\d{1,2}\s?)?1?\-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/,
        'Please provide a valid phone number',
      ],
      minLength: 10,
      maxLength: 10,
    },
    openingTime: {
      type: String,
      required: [true, 'Please provide a opening time'],
    },
    closingTime: {
      type: String,
      required: [true, 'Please provide a closing time'],
    },
    consultationFee: {
      type: Number,
      required: [true, 'Please provide a consultation fee'],
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point', required: true },
      coordinates: { type: [Number] },
    },
    createdAt: {
      type: Date,
      default: Date.now,
      select: false,
    },
    updatedAt: {
      type: Date,
      default: Date.now(),
    },
  },
  {
    versionKey: false,
  }
);

clinicSchema.index({ location: '2dsphere' });

clinicSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

clinicSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

clinicSchema.pre('save', async function (next) {
  try {
    const address = this.clinicAddress;
    const { latitude, longitude } = await getCoordinates(address);

    if (latitude && longitude) {
      this.location = {
        type: 'Point',
        coordinates: [longitude, latitude],
      };
    }

    const existingClinic = await checkExistingClinic(
      latitude,
      longitude,
      this.clinicName,
      this.clinicAddress
    );
    if (existingClinic) {
      const error = new Error(
        'A clinic with the same name and address already exists within the vicinity.'
      );
      next(error);
    } else {
      next();
    }
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

const Clinic = mongoose.model('Clinic', clinicSchema);
module.exports = Clinic;
