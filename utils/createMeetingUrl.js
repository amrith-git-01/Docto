function createMeetingUrl(appointmentId) {
  const baseUrl = process.env.BASE_URL;
  const meetingName = `appointment_${appointmentId}`;

  return `${baseUrl}${meetingName}`;
}

module.exports = { createMeetingUrl };
