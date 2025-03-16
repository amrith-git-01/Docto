const axios = require('axios');

async function getCoordinates(address) {
  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          address: address,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      }
    );

    const location = response.data.results[0];
    if (!location || !location.geometry) {
      throw new Error(
        'Invalid clinic address. Please provide a valid address.'
      );
    }

    const latitude = location.geometry.location.lat;
    const longitude = location.geometry.location.lng;

    return { latitude, longitude };
  } catch (error) {
    throw new Error('Geocoding failed: ' + error.message);
  }
}

async function checkExistingClinic(
  latitude,
  longitude,
  clinicName,
  clinicAddress
) {
  const radiusInMeters = 1000; // 1km radius
  const mongoose = require('mongoose');
  const Clinic = mongoose.model('Clinic');

  const existingClinic = await Clinic.findOne({
    clinicName: clinicName,
    clinicAddress: clinicAddress,
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: radiusInMeters,
      },
    },
  });

  return existingClinic;
}

module.exports = { getCoordinates, checkExistingClinic };
