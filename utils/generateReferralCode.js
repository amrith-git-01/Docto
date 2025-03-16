const crypto = require('crypto');

const generateReferralCode = () => {
  const code = crypto.randomBytes(4).toString('hex').toUpperCase();
  return code;
};

module.exports = { generateReferralCode };
