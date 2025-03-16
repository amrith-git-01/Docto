const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

const Clinic = require('../models/clinicModel');
const Doctor = require('../models/doctorModel');

exports.addClinic = catchAsync(async (req, res, next) => {
  const doctor = await Doctor.findById(req.user.id);
  if (!doctor) {
    return next(new AppError('Doctor not found', 404));
  }

  if (
    !doctor.documents.length ||
    !doctor.qualifications.length ||
    !doctor.specialization
  ) {
    return next(
      new AppError(
        'Please add documents, qualifications and specialization',
        400
      )
    );
  }

  if (doctor.clinic) {
    return next(new AppError('Doctor already has a clinic', 400));
  }
  const clinic = await Clinic.create({
    doctor: req.user.id,
    ...req.body,
  });

  if (!clinic) {
    return next(new AppError('Failed to add clinic', 400));
  }
  doctor.clinic = clinic.id;
  await doctor.save({ validateBeforeSave: false });

  res.status(201).json({
    status: 'success',
    message: 'Successfully added clinic',
    data: {
      clinic,
    },
  });
});

exports.updateClinic = catchAsync(async (req, res, next) => {
  if (req.body.doctor) {
    return next(new AppError('Cannot update doctor', 400));
  }
  const clinic = await Clinic.findByIdAndUpdate(req.user.clinic, req.body, {
    new: true,
    runValidators: true,
  });

  if (!clinic) {
    return next(new AppError('Failed to update clinic', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Successfully updated clinic',
    data: {
      clinic,
    },
  });
});

exports.viewClinicDetails = catchAsync(async (req, res, next) => {
  const clinic = await Clinic.findById(req.user.clinic)
    .populate('doctor')
    .select(
      'name gender phone profile specialization experience qualifications'
    );

  if (!clinic) {
    return next(new AppError('Failed to get clinic details', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      clinic,
    },
  });
});
