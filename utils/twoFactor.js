const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const generateSecret = (email) => {
  return speakeasy.generateSecret({
    name: `EXAM (${email})`,
    issuer: 'EXAM'
  });
};

const verifyToken = (secret, token) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2
  });
};

const generateQRCode = async (otpauthUrl) => {
  try {
    return await QRCode.toDataURL(otpauthUrl);
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};

module.exports = { generateSecret, verifyToken, generateQRCode };

