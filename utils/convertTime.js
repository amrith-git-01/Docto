const convertTo24Hour = (time) => {
  const [hour, minute] = time.split(':');
  const period = time.split(' ')[1] || 'AM';
  let hours = parseInt(hour, 10);
  if (period.toUpperCase() === 'PM' && hours < 12) {
    hours += 12;
  } else if (period.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }
  return hours * 60 + parseInt(minute, 10);
};

const convertMinutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours < 10 ? '0' : ''}${hours}:${mins < 10 ? '0' : ''}${mins}`;
};

const convertTo12HourFormat = (timeString) => {
  let [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${period}`;
};

module.exports = {
  convertTo24Hour,
  convertMinutesToTime,
  convertTo12HourFormat,
};
