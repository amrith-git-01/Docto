const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Appointment = require('../models/appointmentModel');
const Clinic = require('../models/clinicModel');

const {
  convertTo24Hour,
  convertMinutesToTime,
  convertTo12HourFormat,
} = require('../utils/convertTime');
const Patient = require('../models/patientModel');
const Email = require('../services/email');

exports.bookAppointment = catchAsync(async (req, res, next) => {
  try {
    const clinicId = req.params.clinicId;
    const patientId = req.user.id;

    if (!clinicId) {
      return next(new AppError('Please provide the clinic ID', 400));
    }

    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      return next(new AppError('No clinic found with that ID', 404));
    }
    const doctorId = clinic.doctor;

    const { appointmentDate, startTime, consultationType } = req.body;

    if (!appointmentDate || !startTime || !consultationType) {
      return next(
        new AppError('Please provide all the required details!', 400)
      );
    }

    const today = new Date();

    let startOfBookingWindow = new Date();
    startOfBookingWindow.setDate(today.getDate() + 2);
    startOfBookingWindow.setHours(0, 0, 0, 0);

    let endOfBookingWindow = new Date(startOfBookingWindow);
    endOfBookingWindow.setDate(endOfBookingWindow.getDate() + 7);
    endOfBookingWindow.setHours(23, 59, 59, 999);

    const bookingDate = new Date(appointmentDate);
    bookingDate.setHours(0, 0, 0, 0);

    if (
      bookingDate < startOfBookingWindow ||
      bookingDate > endOfBookingWindow
    ) {
      return next(
        new AppError(
          `Appointments can only be booked from ${startOfBookingWindow.toLocaleDateString()} to ${endOfBookingWindow.toLocaleDateString()}`,
          400
        )
      );
    }

    const startMinutes = convertTo24Hour(startTime);
    const lunchStart = convertTo24Hour('1:00 PM');
    const lunchEnd = convertTo24Hour('3:00 PM');

    if (startMinutes >= lunchStart && startMinutes <= lunchEnd) {
      return next(
        new AppError(
          'Lunch break is from 1:00 PM to 3:00 PM, cannot book appointments during this time!',
          400
        )
      );
    }

    const openingHours = convertTo24Hour(clinic.openingTime);
    const closingHours = convertTo24Hour(clinic.closingTime);

    if (startMinutes < openingHours || startMinutes >= closingHours) {
      return next(
        new AppError(
          `Appointments can only be booked between ${clinic.openingTime} and ${clinic.closingTime}`,
          400
        )
      );
    }

    if (startMinutes % 30 !== 0) {
      return next(
        new AppError(
          'Appointments can only be booked in 30-minute intervals!',
          400
        )
      );
    }

    const endMinutes = startMinutes + 30;
    let endTimeString = convertMinutesToTime(endMinutes);
    endTimeString = convertTo12HourFormat(endTimeString);

    const overlappingAppointments = await Appointment.find({
      doctor: doctorId,
      appointmentDate: appointmentDate,
      status: { $ne: 'cancelled' },
      $or: [
        { startTime: { $gte: startTime, $lt: endTimeString } },
        { endTime: { $gt: startTime, $lte: endTimeString } },
        {
          startTime: { $lt: endTimeString },
          endTime: { $gt: startTime },
        },
      ],
    });

    const exactSameTimeSlot = await Appointment.findOne({
      doctor: doctorId,
      appointmentDate: appointmentDate,
      status: { $ne: 'cancelled' },
      startTime: startTime,
      endTime: endTimeString,
    });

    if (overlappingAppointments.length > 0 || exactSameTimeSlot) {
      return next(
        new AppError(
          'This time slot has already been booked or overlaps with another appointment, please choose another available time slot!',
          400
        )
      );
    }

    const appointmentFee = clinic.consultationFee;
    const appointment = await Appointment.create({
      doctor: doctorId,
      clinic: clinicId,
      patient: patientId,
      appointmentDate,
      startTime,
      endTime: endTimeString,
      appointmentFee,
      consultationType,
    });

    res.status(201).json({
      status: 'success',
      message:
        'Appointment booked successfully, complete the payment to confirm!',
      data: {
        appointment: {
          id: appointment.id,
          doctor: appointment.doctor,
          clinic: appointment.clinic,
          patient: appointment.patient,
          appointmentDate: appointment.appointmentDate,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          appointmentFee: appointment.appointmentFee,
          consultationType: appointment.consultationType,
        },
      },
    });
  } catch (err) {
    console.log(err);
  }
});

exports.cancelAppointment = catchAsync(async (req, res, next) => {
  try {
    const appointmentId = req.params.id;
    if (!appointmentId) {
      return next(new AppError('Please provide the appointment ID', 400));
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return next(new AppError('Appointment not found', 404));
    }

    if (appointment.status === 'cancelled') {
      return next(
        new AppError('This appointment has already been cancelled', 400)
      );
    }

    const today = new Date();
    const appointmentDate = new Date(appointment.appointmentDate);

    const startMinutes = convertTo24Hour(appointment.startTime);
    const appointmentStartTime = new Date(appointment.appointmentDate);
    appointmentStartTime.setMinutes(
      appointmentStartTime.getMinutes() + startMinutes
    );

    const lastCancellableTime = new Date(appointmentStartTime);
    lastCancellableTime.setMinutes(appointmentStartTime.getMinutes() - 1);

    const appointmentFee = appointment.appointmentFee;

    let refundAmount = 0;

    if (today < appointmentDate) {
      refundAmount = appointmentFee;
    } else if (today >= appointmentDate && today <= lastCancellableTime) {
      refundAmount = appointmentFee * 0.5;
    } else {
      console.log(
        'Cannot cancel: The appointment has already started or passed.'
      );
      return next(new AppError('Cannot cancel the appointment', 400));
    }

    if (refundAmount > 0) {
      appointment.status = 'cancelled';
      appointment.paymentStatus = 'refunded';
      await appointment.save({ validateBeforeSave: false });

      const patient = await Patient.findById(appointment.patient);
      const refundURL = `${req.protocol}://${req.get(
        'host'
      )}/api/v1/appointments/${appointment.id}/refund`;

      await new Email(
        patient,
        refundURL,
        appointment,
        refundAmount
      ).sendCancellation();

      return res.status(200).json({
        status: 'success',
        message: 'Appointment cancelled successfully',
        data: {
          appointment: {
            id: appointment.id,
            status: appointment.status,
            paymentStatus: appointment.paymentStatus,
            refundAmount: refundAmount,
          },
        },
      });
    }

    // Default case to handle failed cancellations
    return next(new AppError('Cannot cancel the appointment', 400));
  } catch (err) {
    console.log(err);
    return next(new AppError('Internal Server Error', 500));
  }
});
