const Patient = require('../models/patientModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { filterObj } = require('../utils/filterBody');
const Doctor = require('../models/doctorModel');
const Clinic = require('../models/clinicModel');
const APIFeatures = require('../utils/apiFeatures');

exports.updatePersonalDetails = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('This route is not for password updates.', 400));
  }

  const filteredBody = filterObj(
    req.body,
    'name',
    'gender',
    'dob',
    'phone',
    'address'
  );
  const updatedPatient = await Patient.findByIdAndUpdate(
    req.user.id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    }
  );
  if (!updatedPatient) {
    return next(new AppError('Patient not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      patient: updatedPatient,
    },
  });
});

exports.getMe = catchAsync(async (req, res, next) => {
  const patient = await Patient.findById(req.user.id).select(
    '-isDeleted -createdAt -updatedAt'
  );
  if (!patient) {
    return next(new AppError('No patient found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      patient,
    },
  });
});

exports.viewDoctor = catchAsync(async (req, res, next) => {
  const doctorId = req.params.id;
  const doctor = await Doctor.findById(doctorId).populate({
    path: 'clinic',
    select: 'clinicName description clinicAddress',
  });

  if (!doctor) {
    return next(new AppError('No doctor found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Doctor fetched successfully',
    data: {
      doctor,
    },
  });
});

exports.viewAllDoctors = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    Doctor.find()
      .select('-email -dob -address -documents')
      .populate({ path: 'clinic', select: 'clinicName' }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const doctors = await features.query;

  if (!doctors) {
    return next(new AppError('No doctors found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'All doctors fetched successfully',
    data: {
      doctors,
    },
  });
});

exports.viewClinic = catchAsync(async (req, res, next) => {
  const clinicId = req.params.id;
  const clinic = await Clinic.findById(clinicId).select('-location').populate({
    path: 'doctor',
    select:
      'name gender phonne profile specialization experience qualifications',
  });

  if (!clinic) {
    return next(new AppError('No clinic found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Clinic fetched successfully',
    data: {
      clinic,
    },
  });
});

exports.viewAllClinics = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    Clinic.find()
      .select('clinicName description clinicAddress contactNumber ')
      .populate({
        path: 'doctor',
        select:
          'name gender phone profile specialization experience qualifications',
      }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const clinics = await features.query;

  if (!clinics) {
    return next(new AppError('No clinics found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'All clinics fetched successfully',
    data: {
      clinics,
    },
  });
});
