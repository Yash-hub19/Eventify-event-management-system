const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const generateBookingCode = () => {
  return `EVT-${uuidv4().split('-')[0].toUpperCase()}`;
};

const generateQRCode = async (data) => {
  try {
    return await QRCode.toDataURL(JSON.stringify(data));
  } catch (err) {
    console.error('QR generation failed', err);
    return '';
  }
};

module.exports = { generateBookingCode, generateQRCode };
