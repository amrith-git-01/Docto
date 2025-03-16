const Tesseract = require('tesseract.js');
const sharp = require('sharp');

const enhanceImage = async (fileBuffer) => {
  return sharp(fileBuffer)
    .resize(800)
    .grayscale()
    .normalize()
    .sharpen()
    .toBuffer();
};

const validateDocument = async (fileBuffer, doctorQualifications) => {
  const enhancedImage = await enhanceImage(fileBuffer);

  const {
    data: { text },
  } = await Tesseract.recognize(enhancedImage, 'eng');

  const documentText = text.toLowerCase();

  const qualificationsMatch = doctorQualifications.some((qualification) =>
    documentText.includes(qualification.toLowerCase())
  );

  return qualificationsMatch ? enhancedImage : false;
};

module.exports = { validateDocument };
