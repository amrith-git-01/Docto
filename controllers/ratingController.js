const Rating = require('../models/ratingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Appointment = require('../models/appointmentModel');

exports.createRating = catchAsync(async (req, res, next) => {
  const newRating = await Rating.create({
    rating: req.body.rating,
    patient: req.user.id,
    appointment: req.params.id,
  });

  if (!newRating) {
    return next(new AppError('Failed to create rating', 400));
  }

  res.status(201).json({
    status: 'success',
    message: 'Successfully rated the appointment',
    data: {
      newRating,
    },
  });
});

exports.updateRating = catchAsync(async (req, res, next) => {
  const newRating = req.body.rating;
  if (!newRating) {
    return next(new AppError('Please provide a rating', 400));
  }
  const updatedRating = await Rating.findByIdAndUpdate(
    req.params.id,
    { rating: newRating },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedRating) {
    return next(new AppError('Failed to update rating', 400));
  }

  res.status(200).json({
    status: 'success',
    message: 'Successfully updated rating',
    data: {
      updatedRating,
    },
  });
});

exports.deleteRating = catchAsync(async (req, res, next) => {
  const rating = await Rating.findByIdAndDelete(req.body.id);
});

exports.checkValidRatingCreation = catchAsync(async (req, res, next) => {
  const appointmentId = req.params.id;
  if (!appointmentId) {
    return next(new AppError('Please provide appointment id', 400));
  }
  const { rating } = req.body;
  if (!rating) {
    return next(new AppError('Please provide rating', 400));
  }
  const existingRating = await Rating.findOne({
    appointment: appointmentId,
    patient: req.user.id,
  });

  if (existingRating) {
    return next(new AppError('You have already rated this appointment', 400));
  }
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return next(new AppError('Invalid appointment id', 404));
  }
  if (appointment.status !== 'completed') {
    return next(
      new AppError('Cannot rate an appointment that is not completed', 400)
    );
  }

  next();
});

exports.deleteRating = catchAsync(async (req, res, next) => {
  try {
    const rating = await Rating.findByIdAndDelete(req.params.id);

    if (!rating) {
      return next(new AppError('Error deleting rating', 404));
    }
    res.status(200).json({
      status: 'success',
      message: 'Successfully deleted rating',
    });
  } catch (err) {
    console.log(err);
  }
});

exports.checkValidRatingUpdationAndDeletion = catchAsync(
  async (req, res, next) => {
    const ratingId = req.params.id;
    if (!ratingId) {
      return next(new AppError('Please provide rating id', 400));
    }
    const existingRating = await Rating.findById(ratingId);

    if (!existingRating) {
      return next(new AppError('There is no rating with that id', 404));
    }
    next();
  }
);
