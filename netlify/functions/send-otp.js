const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { contact, otp } = JSON.parse(event.body);

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Gmail credentials are not configured on Netlify.' })
      };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const htmlBody = `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0a0a0f;margin:0;padding:40px"><div style="max-width:480px;margin:0 auto;background:#111118;border-radius:24px;overflow:hidden;border:1px solid #1f1f2e"><div style="background:linear-gradient(135deg,#7b5cff,#00c6ff);padding:32px;text-align:center"><h1 style="color:#fff;margin:0;font-size:20px;font-weight:900">DJ Flowerz Verification</h1></div><div style="padding:40px;text-align:center"><p style="color:#9ca3af;font-size:14px;margin:0 0 24px">Use the code below to verify your account. Valid for 10 minutes.</p><div style="background:#0d0d14;border:2px dashed #2a2a3d;border-radius:16px;padding:32px;margin:24px 0"><span style="font-size:48px;font-weight:900;letter-spacing:12px;color:#fff;font-family:monospace">${otp}</span><p style="color:#6b7280;font-size:12px;margin:8px 0 0">Expires in 10 minutes</p></div><p style="color:#6b7280;font-size:12px">If you didn't request this, ignore this email.</p></div></div></body></html>`;

    await transporter.sendMail({
      from: '"DJ Flowerz" <' + process.env.GMAIL_USER + '>',
      to: contact,
      subject: `Your DJ Flowerz verification code: ${otp}`,
      html: htmlBody
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Email sent successfully via Gmail SMTP' })
    };
  } catch (error) {
    console.error("Nodemailer error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
