const QRCode = require('qrcode');

/**
 * Generates a single compact QR code for fast scanning.
 * Payload is minimal — full team details are always fetched from DB on scan.
 *
 * @param {Object} params
 * @param {string} params.teamId
 * @param {string} params.teamName
 * @param {number} params.presentCount
 */
async function generateQR({ teamId, teamName, presentCount }) {
  // Minimal payload — short keys keep QR simple for fast scanning
  const payload = {
    i: teamId,          // team_id
    t: teamName,        // team_name
    n: presentCount,    // number of present members
  };

  const qrImage = await QRCode.toDataURL(JSON.stringify(payload), {
    errorCorrectionLevel: 'M',   // 'M' (15%) is sufficient and keeps QR smaller/faster
    type: 'image/png',
    margin: 2,
    width: 300,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  return { qrImage, payload };
}

module.exports = { generateQR };
