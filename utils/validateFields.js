const VALID_SPECIALIZATIONS = [
  'Cardiology',
  'Dermatology',
  'Neurology',
  'Pediatrics',
  'Orthopedics',
  'Psychiatry',
  'Radiology',
  'Anesthesiology',
  'Oncology',
  'Endocrinology',
  'Gastroenterology',
  'Nephrology',
  'Hematology',
  'Rheumatology',
  'Obstetrics and Gynecology',
  'General Medicine',
  'General Surgery',
  'Pulmonology',
  'Ophthalmology',
  'ENT',
  'Plastic Surgery',
  'Urology',
  'Pathology',
  'Geriatrics',
  'Allergy and Immunology',
  'Critical Care Medicine',
  'Sports Medicine',
  'Infectious Disease',
  'Family Medicine',
  'Vascular Surgery',
];

const VALID_QUALIFICATIONS = [
  'MBBS',
  'MD',
  'MS',
  'DM',
  'MCh',
  'DNB',
  'DO',
  'BDS',
  'MDS',
  'BAMS',
  'BHMS',
  'BPT',
  'MPT',
  'PharmD',
  'MPH',
  'FRCS',
  'MRCP',
  'FRCPath',
  'DGO',
  'DMRD',
];

const validateFields = function ({ specialization, qualifications }) {
  const isSpecializationValid = VALID_SPECIALIZATIONS.includes(specialization);

  const inValidQualifications = qualifications.filter(
    (qualification) => !VALID_QUALIFICATIONS.includes(qualification)
  );

  return isSpecializationValid && inValidQualifications.length === 0;
};

module.exports = { validateFields };
