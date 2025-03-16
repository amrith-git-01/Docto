const Comment = require('../models/commentModel');
const Appointment = require('../models/appointmentModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createComment = catchAsync(async (req, res, next) => {
  const { comment } = req.body;
  const newComment = await Comment.create({
    comment,
    patient: req.user.id,
    appointment: req.params.id,
  });
  if (!newComment) {
    return next(new AppError('Failed to create comment', 400));
  }

  res.status(201).json({
    status: 'success',
    message: 'Successfully commented on the appointment',
    data: {
      comment: newComment,
    },
  });
});

exports.updateComment = catchAsync(async (req, res, next) => {
  const { comment } = req.body;
  if (!comment) {
    return next(new AppError('Comment cannot be empty', 400));
  }
  const commentId = req.params.id;
  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      comment,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedComment) {
    return next(new AppError('Failed to update comment', 400));
  }
  res.status(200).json({
    status: 'success',
    message: 'Successfully updated comment',
    data: {
      comment: updatedComment,
    },
  });
});

exports.deleteComment = catchAsync(async (req, res, next) => {
  const commentId = req.params.id;
  const comment = await Comment.findByIdAndDelete(commentId);
  if (!comment) {
    return next(new AppError('Failed to delete comment', 400));
  }

  res.status(200).json({
    status: 'success',
    message: 'Successfully deleted comment',
  });
});

exports.validCommentCreation = catchAsync(async (req, res, next) => {
  const { comment } = req.body;
  if (!comment) {
    return next(new AppError('Comment cannot be empty', 400));
  }

  const appointmentId = req.params.id;
  if (!appointmentId) {
    return next(new AppError('Please provide appointment id', 400));
  }
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return next(new AppError('Invalid appointment id', 404));
  }
  if (appointment.status !== 'completed') {
    return next(
      new AppError(
        'Cannot add comment to an appointment that is not completed',
        400
      )
    );
  }
  const existingComment = await Comment.findOne({
    appointment: appointmentId,
    patient: req.user.id,
  });
  if (existingComment) {
    return next(
      new AppError('You have already commented on this appointment', 400)
    );
  }
  next();
});

exports.checkValidCommentUpdationAndDeletion = catchAsync(
  async (req, res, next) => {
    const commentId = req.params.id;
    if (!commentId) {
      return next(new AppError('Please provide comment id', 400));
    }
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return next(new AppError('There is no comment with that id', 404));
    }
    next();
  }
);
