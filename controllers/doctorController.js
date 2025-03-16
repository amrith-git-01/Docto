const Doctor = require('../models/doctorModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { filterObj } = require('../utils/filterBody');
const { validateFields } = require('../utils/validateFields');
const { validateDocument } = require('../services/validateDocuments');
const multer = require('multer');
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
} = require('@aws-sdk/client-s3');
const Appointment = require('../models/appointmentModel');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new AppError('Please upload an image file!', 400));
    }
    cb(null, true);
  },
});

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
    'address',
    'specialization',
    'experience',
    'qualifications'
  );

  const isRequestValid = await validateFields(filteredBody);

  if (!isRequestValid) {
    return next(
      new AppError(
        'Invalid specialization or qualifications. Please enter them properly!',
        400
      )
    );
  }

  const updatedDoctor = await Doctor.findByIdAndUpdate(
    req.user.id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    }
  );
  if (!updatedDoctor) {
    return next(new AppError('No doctor found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      doctor: updatedDoctor,
    },
  });
});

exports.uploadDocuments = catchAsync(async (req, res, next) => {
  upload.array('file')(req, res, async (err) => {
    if (err) {
      return next(new AppError('File upload failed!', 400));
    }

    try {
      const files = req.files;
      if (!files || files.length === 0) {
        return next(new AppError('Please upload a file', 404));
      }

      const doctorId = req.user.id;
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return next(new AppError('No doctor found with that ID', 404));
      }

      for (const file of files) {
        const document = await validateDocument(
          file.buffer,
          doctor.qualifications
        );

        if (!document) {
          return next(
            new AppError(
              'Invalid document. Please upload a valid document.',
              400
            )
          );
        }

        const originalName = file.originalname.replace(/\s+/g, '_');
        const mimeType = file.mimetype;
        const fileKey = `Documents/${doctorId}/${originalName}`;

        const listParams = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Prefix: `Documents/${doctorId}/`,
        };
        const listCommand = new ListObjectsV2Command(listParams);
        const listResponse = await s3.send(listCommand);
        console.log(listResponse);
        if (listResponse) {
          const fileExists = listResponse.Contents.some(
            (item) => item.Key === fileKey
          );
          if (fileExists) {
            return next(new AppError('Document already exists', 400));
          }
        }

        const uploadParams = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: fileKey,
          Body: document,
          ContentType: mimeType,
          ACL: 'public-read',
        };

        const command = new PutObjectCommand(uploadParams);
        await s3.send(command);

        const documentURL = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${fileKey}`;

        doctor.documents.push(documentURL);
      }
      await doctor.save({ validateBeforeSave: false });

      return res.status(200).json({
        status: 'success',
        message: 'Document(s) uploaded successfully',
        documents: doctor.documents,
      });
    } catch (err) {
      return next(err);
    }
  });
});

exports.getMe = catchAsync(async (req, res, next) => {
  const doctor = await Doctor.findById(req.user.id).select(
    '-createdAt -updatedAt -isDeleted'
  );
  if (!doctor) {
    return next(new AppError('No doctor found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      doctor,
    },
  });
});

exports.viewAppointments = catchAsync(async (req, res, next) => {
  const today = new Date();
  const startOfDay = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const endOfDay = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() + 1
    )
  );
  const appointments = await Appointment.find({
    appointmentDate: {
      $gte: startOfDay,
      $lt: endOfDay,
    },
    doctor: req.user.id,
  });
  res.status(200).json({
    status: 'success',
    data: {
      appointments,
    },
  });
});

exports.viewAllAppointments = catchAsync(async (req, res, next) => {
  const appointments = await Appointment.find({
    doctor: req.user.id,
  });

  res.status(200).json({
    status: 'success',
    data: {
      appointments,
    },
  });
});
