const sharp = require('sharp');
const multer = require('multer');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

const Doctor = require('../models/doctorModel');
const Patient = require('../models/patientModel');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

exports.upload = catchAsync(async (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return next(new AppError('File upload failed!', 400));
    }
    try {
      const file = req.file;
      if (!file) {
        return next(new AppError('Please upload a file', 404));
      }

      const prefix = req.user.role === 'patient' ? 'Patients' : 'Doctors';
      const listParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Prefix: `ProfilePhotos/${prefix}/${req.user.id}`,
      };

      const listCommand = new ListObjectsV2Command(listParams);
      const listResponse = await s3.send(listCommand);

      // Check if there are existing profile photos
      if (listResponse.Contents && listResponse.Contents.length > 0) {
        return next(
          new AppError(
            'You have already uploaded a profile photo. If you want to modify it, please use the /modify endpoint!',
            400
          )
        );
      }

      // Process the image using Sharp
      const processedImage = await sharp(file.buffer)
        .resize(800, 800)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toBuffer();

      const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `ProfilePhotos/${prefix}/${req.user.id}/${file.originalname}`,
        Body: processedImage,
        ContentType: file.mimetype,
        ACL: 'public-read',
      };

      const command = new PutObjectCommand(uploadParams);

      await s3.send(command);

      const profilePhotoURL = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/ProfilePhotos/${prefix}/${req.user.id}/${file.originalname}`;

      // Update user's profile photo
      let user;
      if (req.user.role === 'patient') {
        user = await Patient.findByIdAndUpdate(
          req.user.id,
          { profile: profilePhotoURL },
          { new: true }
        );
      } else {
        user = await Doctor.findByIdAndUpdate(
          req.user.id,
          { profile: profilePhotoURL },
          { new: true }
        );
      }

      if (!user) {
        return next(new AppError('User not found', 404));
      }

      res.status(200).json({
        status: 'success',
        message: 'Profile photo uploaded successfully',
        data: {
          profilePhoto: profilePhotoURL,
        },
      });
    } catch (err) {
      console.log(err);
    }
  });
});

exports.modify = catchAsync(async (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return next(new AppError('File upload failed!', 400));
    }
    try {
      const file = req.file;
      if (!file) {
        return next(
          new AppError('No file uploaded, please upload a file!', 400)
        );
      }

      const prefix = req.user.role === 'patient' ? 'Patients' : 'Doctors';

      const listParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Prefix: `ProfilePhotos/${prefix}/${req.user.id}/`,
        Delimiter: '/',
      };

      const listCommand = new ListObjectsV2Command(listParams);
      const listResponse = await s3.send(listCommand);

      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        return next(
          new AppError(
            'You have not uploaded a profile photo yet, please upload one first!',
            400
          )
        );
      }

      // Process the new image
      const processedImage = await sharp(file.buffer)
        .resize(800, 800)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toBuffer();

      // Set the new file key
      const newKey = `ProfilePhotos/${prefix}/${req.user.id}/${file.originalname}`;

      const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: newKey,
        Body: processedImage,
        ContentType: file.mimetype,
        ACL: 'public-read',
      };

      // Upload the new file
      const command = new PutObjectCommand(uploadParams);
      await s3.send(command);

      // Delete the old file
      const oldKey = listResponse.Contents[0].Key;
      const deleteParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: oldKey,
      };
      const deleteCommand = new DeleteObjectCommand(deleteParams);
      await s3.send(deleteCommand);

      // Update the user's profile photo URL in the database
      const profilePhotoURL = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${newKey}`;
      let user = req.user;
      if (req.user.role === 'patient') {
        user = await Patient.findByIdAndUpdate(
          req.user.id,
          { profile: profilePhotoURL },
          { new: true }
        );
      } else {
        user = await Doctor.findByIdAndUpdate(
          req.user.id,
          { profile: profilePhotoURL },
          { new: true }
        );
      }

      res.status(200).json({
        status: 'success',
        message: 'Profile photo modified successfully',
        data: {
          profilePhoto: profilePhotoURL,
        },
      });
    } catch (err) {
      next(err); // Pass errors to global error handler
    }
  });
});

exports.remove = catchAsync(async (req, res, next) => {
  try {
    const prefix = req.user.role === 'patient' ? 'Patients' : 'Doctors';
    const userFolderPrefix = `ProfilePhotos/${prefix}/${req.user.id}/`;

    const listParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Prefix: userFolderPrefix, // This will list only files under the user's folder
    };

    // List objects in the user's profile photo folder
    const listCommand = new ListObjectsV2Command(listParams);
    const listResponse = await s3.send(listCommand);

    // Check if there are any files to delete
    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      return next(
        new AppError(
          'You have not uploaded a profile photo yet. Please use the /upload route to upload a profile photo!',
          400
        )
      );
    }

    // Delete the user's profile photo (just the specific file, not the folder)
    for (const file of listResponse.Contents) {
      const deleteParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: file.Key,
      };
      const deleteCommand = new DeleteObjectCommand(deleteParams);
      await s3.send(deleteCommand);
    }

    // Update the user's profile photo URL in the database to null
    if (req.user.role === 'patient') {
      await Patient.findByIdAndUpdate(req.user.id, { profile: null });
    } else {
      await Doctor.findByIdAndUpdate(req.user.id, { profile: null });
    }

    // Respond to the client
    res.status(200).json({
      status: 'success',
      message: 'Profile photo removed successfully',
    });
  } catch (err) {
    console.error(err); // Log the error for debugging
    next(err); // Pass the error to the global error handler
  }
});
