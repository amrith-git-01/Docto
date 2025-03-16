const Agenda = require('agenda');
const Appointment = require('../models/appointmentModel');
const Patient = require('../models/patientModel');
const Email = require('./email');
const { createMeetingUrl } = require('../utils/createMeetingUrl');
const cron = require('node-cron');
const moment = require('moment');
const { convertTo24Hour } = require('../utils/convertTime');

const database = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

const agenda = new Agenda({ db: { address: database } });

agenda.define('sendEmailRemainders', async (job) => {
  const today = moment().startOf('day');
  const tomorrow = moment(today).add(1, 'day');

  try {
    const appointments = await Appointment.find({
      status: 'confirmed',
      paymentStatus: 'successful',
      appointmentDate: { $gte: today.toDate(), $lt: tomorrow.toDate() },
      consultationType: 'online',
    }).populate('patient');

    for (const appointment of appointments) {
      const patient = appointment.patient;
      if (!patient) {
        console.error('Patient not found for appointment ID:', appointment.id);
        continue;
      }
      const host = process.env.HOST;
      const bookingUrl = `${host}/appointments/${appointment.id}`;
      const email = new Email(patient, bookingUrl, appointment);
      await email.sendRemainder();

      const appointmentStartTime = convertTo24Hour(appointment.startTime);
      const appointmentTime = moment(appointment.appointmentDate);

      const localAppointmentTime = appointmentTime.set({
        hour: Math.floor(appointmentStartTime / 60),
        minute: appointmentStartTime % 60,
      });

      const tenMinutesBefore = localAppointmentTime
        .clone()
        .subtract(10, 'minutes');

      agenda.schedule(tenMinutesBefore.toDate(), 'sendMeetingUrlEmail', {
        patient,
        appointment,
      });

      const meetingEndTime = moment(appointment.appointmentDate).set({
        hour: Math.floor(appointmentStartTime / 60),
        minute: appointment.endTime % 60,
      });

      agenda.schedule(meetingEndTime.toDate(), 'makAppointmentCompleted', {
        appointmentId: appointment._id,
      });
    }
  } catch (err) {
    console.error('Error fetching or processing appointments:', err);
  }
});

agenda.define('sendMeetingUrlEmail', async (job) => {
  const { patient, appointment } = job.attrs.data;

  const meetingUrl = createMeetingUrl(appointment._id);

  const email = new Email(patient);
  await email.sendMeetingUrl(appointment._id, meetingUrl);
});

agenda.define('makAppointmentCompleted', async (job) => {
  console.log(job.attrs.data);
  const { appointmentId } = job.attrs.data;
  const appointment = await Appointment.findById(appointmentId);
  try {
    appointment.status = 'completed';
    await appointment.save({ validateBeforeSave: false });
  } catch (err) {
    console.log(err);
  }
});

cron.schedule('0 6 * * *', () => {
  console.log('Scheduling reminder email job at 6:00 AM');
  agenda.now('sendEmailRemainders');
});

agenda.on('ready', async () => {
  console.log('Agenda is ready');
  await agenda.start();
});
