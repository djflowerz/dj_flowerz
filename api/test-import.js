import nodemailer from 'nodemailer';
export default function handler(req, res) {
    res.status(200).json({ status: 'import-ok', hasNodemailer: !!nodemailer });
}
