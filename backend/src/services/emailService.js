const nodemailer = require('nodemailer');

/**
 * Sends a congratulatory email to the team leader with their QR code.
 * Design: deep space purple theme, Array Bold font, FA icons (inline SVG).
 */
async function sendQREmail({
  toEmail,
  leaderName,
  teamName,
  teamId,
  presentMembers,
  presentCount,
  totalMembers,
  qrBase64,
}) {
  const base64Data = qrBase64.replace(/^data:image\/png;base64,/, '');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Inline SVG icons (reliable across email clients — no external font dependency)
  const iconUser = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 448 512" fill="#a78bfa" style="vertical-align:middle; margin-right:8px;"><path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z"/></svg>`;
  const iconShield = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 512 512" fill="#f87171" style="vertical-align:middle; margin-right:8px;"><path d="M256 0c4.6 0 9.2 1 13.4 2.9L457.7 82.8c22 9.3 38.4 31 38.3 57.2c-.5 99.2-41.3 280.7-213.7 363.2c-16.7 8-36.1 8-52.8 0C57.3 420.7 16.5 239.2 16 140c-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.8 1 251.4 0 256 0z"/></svg>`;
  const iconQr = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 448 512" fill="#a78bfa" style="vertical-align:middle; margin-right:8px;"><path d="M0 80C0 53.5 21.5 32 48 32h96c26.5 0 48 21.5 48 48v96c0 26.5-21.5 48-48 48H48C21.5 224 0 202.5 0 176V80zM64 96v64h64V96H64zM0 336c0-26.5 21.5-48 48-48h96c26.5 0 48 21.5 48 48v96c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V336zm64 16v64h64V352H64zM304 32h96c26.5 0 48 21.5 48 48v96c0 26.5-21.5 48-48 48H304c-26.5 0-48-21.5-48-48V80c0-26.5 21.5-48 48-48zm80 64H320v64h64V96zM256 304c0-8.8 7.2-16 16-16h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H272c-8.8 0-16-7.2-16-16V304zm96 16v-16c0-8.8 7.2-16 16-16h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H368c-8.8 0-16-7.2-16-16zm-64 64c0-8.8 7.2-16 16-16h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H304c-8.8 0-16-7.2-16-16V384zm96 0v-16c0-8.8 7.2-16 16-16h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H384c-8.8 0-16-7.2-16-16zm-64 64c0-8.8 7.2-16 16-16h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H304c-8.8 0-16-7.2-16-16V448zm96 0v-16c0-8.8 7.2-16 16-16h16c8.8 0 16 7.2 16 16v16c0 8.8-7.2 16-16 16H384c-8.8 0-16-7.2-16-16z"/></svg>`;
  const iconStar = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 576 512" fill="#a78bfa" style="vertical-align:middle; margin-right:6px;"><path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329l-24.6 145.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/></svg>`;

  const presentListHtml = presentMembers
    .map(
      (name) =>
        `<tr>
          <td style="padding: 8px 0; border-bottom: 1px solid rgba(167,139,250,0.08);">
            <span style="display:inline-block;">${iconUser}</span>
            <span style="color: #e2e8f0; font-size: 14px;">${name}</span>
          </td>
        </tr>`
    )
    .join('');

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hackaccino 4.0 — Your QR Code</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap" rel="stylesheet" />
</head>
<body style="margin:0; padding:0; background-color:#06000f; font-family: 'Outfit', 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#06000f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px; width:100%; background:#0e0520; border-radius:24px; overflow:hidden; border: 1px solid rgba(167,139,250,0.15);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a0a3d 0%, #2e1065 50%, #1a0a3d 100%); padding: 36px 40px; text-align:center; border-bottom: 2px solid rgba(167,139,250,0.4);">
              <p style="margin:0 0 10px 0; font-size:10px; font-weight:700; letter-spacing:0.3em; color:rgba(167,139,250,0.6); text-transform:uppercase;">Bennett University &middot; CSI</p>
              <h1 style="margin:0; font-family:'Outfit','Helvetica Neue',Arial,sans-serif; font-size:42px; font-weight:900; color:#ffffff; letter-spacing:2px; line-height:1; text-transform:uppercase;">
                HACKACCINO <span style="color:#ffffff; opacity:0.5;">4.0</span>
              </h1>
              <div style="margin: 14px auto 0; width:60px; height:3px; background: linear-gradient(90deg, transparent, #a78bfa, transparent); border-radius:2px;"></div>
              <p style="margin: 12px 0 0 0; font-size:11px; color:rgba(167,139,250,0.5); letter-spacing:0.15em; text-transform:uppercase;">All-in-One Hackathon Dashboard</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">

              <!-- Congrats Label -->
              <p style="margin:0 0 8px 0; font-size:11px; font-weight:700; color:#a78bfa; text-transform:uppercase; letter-spacing:0.2em;">
                ${iconStar} Congratulations
              </p>
              <h2 style="margin:0 0 18px 0; font-size:26px; font-weight:800; color:#ffffff; line-height:1.35; font-family:'Outfit','Helvetica Neue',Arial,sans-serif;">
                ${leaderName}, your hackathon<br/>journey starts here!
              </h2>
              <p style="margin:0 0 30px 0; font-size:14px; color:rgba(255,255,255,0.5); line-height:1.75;">
                Your team <strong style="color:#c4b5fd;">${teamName}</strong> has been successfully checked in at Hackaccino 4.0.
                Below is your exclusive team QR code. Present it at designated event checkpoints.
              </p>

              <!-- Members List -->
              <div style="background:rgba(167,139,250,0.05); border:1px solid rgba(167,139,250,0.12); border-radius:16px; padding:20px 24px; margin-bottom:28px;">
                <p style="margin:0 0 14px 0; font-size:10px; font-weight:700; letter-spacing:0.25em; color:rgba(167,139,250,0.5); text-transform:uppercase;">
                  ${iconUser} Checked-in Members &mdash; ${presentCount} of ${totalMembers}
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  ${presentListHtml}
                </table>
              </div>

              <!-- QR Code Block -->
              <div style="text-align:center; margin-bottom:28px;">
                <p style="margin:0 0 16px 0; font-size:10px; font-weight:700; letter-spacing:0.25em; color:rgba(167,139,250,0.5); text-transform:uppercase;">
                  ${iconQr} Your Team QR Code
                </p>
                <div style="display:inline-block; background:#ffffff; border-radius:20px; padding:18px; box-shadow: 0 0 48px rgba(139,92,246,0.25);">
                  <img src="cid:team_qr_code" alt="Hackaccino QR Code"
                    style="display:block; width:240px; height:240px; border-radius:8px;" />
                </div>
                <p style="margin:14px 0 0 0; font-size:11px; color:rgba(255,255,255,0.2); letter-spacing:0.05em;">
                  Issued ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <!-- Warning Box -->
              <div style="background:rgba(239,68,68,0.07); border:1px solid rgba(239,68,68,0.18); border-radius:14px; padding:18px 20px; margin-bottom:36px;">
                <p style="margin:0 0 6px 0; font-size:13px; font-weight:800; color:#f87171; font-family:'Outfit','Helvetica Neue',Arial,sans-serif;">
                  ${iconShield} Do NOT share this QR code
                </p>
                <p style="margin:0; font-size:13px; color:rgba(248,113,113,0.75); line-height:1.65;">
                  This QR is <strong style="color:#fca5a5;">unique to your team</strong> and grants access to event resources.
                  Sharing it may result in disqualification.
                </p>
              </div>

              <!-- Closing -->
              <p style="margin:0; font-size:13px; color:rgba(255,255,255,0.25); text-align:center; line-height:1.9;">
                Good luck, Team ${teamName}! We can't wait to see what you build.<br/>
                <span style="font-size:11px; color:rgba(255,255,255,0.15);">For any issues, contact your event coordinator on-site.</span>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:rgba(167,139,250,0.03); border-top:1px solid rgba(167,139,250,0.08); padding:20px 40px; text-align:center;">
              <p style="margin:0; font-size:10px; color:rgba(255,255,255,0.15); letter-spacing:0.12em; text-transform:uppercase;">
                &copy; ${new Date().getFullYear()} Hackaccino &middot; Bennett University &middot; Computer Society of India
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const mailOptions = {
    from: `"Hackaccino 4.0" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Hackaccino 4.0 — Your Hackathon Journey Starts Here, ${leaderName}!`,
    html: emailHtml,
    attachments: [
      {
        filename: `hackaccino_qr_team_${teamId}.png`,
        content: base64Data,
        encoding: 'base64',
        cid: 'team_qr_code',
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[emailService] QR email sent to ${toEmail} — MessageId: ${info.messageId}`);
  return info;
}

module.exports = { sendQREmail };
