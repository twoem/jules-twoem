// src/config/mailer.js
const nodemailer = require('nodemailer');

// Create a transporter object using SMTP settings from .env
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10), // Ensure port is an integer
    secure: parseInt(process.env.SMTP_PORT, 10) === 465, // true for 465, false for other ports like 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    // Optional: add debug and logger for development
    // logger: process.env.NODE_ENV === 'development',
    // debug: process.env.NODE_ENV === 'development'
});

// Verify connection configuration (optional, but good for startup check)
if (process.env.NODE_ENV !== 'test') { // Avoid trying to connect during tests if not needed
    transporter.verify((error, success) => {
        if (error) {
            console.error('Mailer Connection Error:', error);
        } else {
            console.log('Mailer is ready to send emails.');
        }
    });
}
/**
 * Sends an email.
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject of the email.
 * @param {string} html - The HTML body of the email.
 * @param {string} [replyTo] - Optional: The email address to set as Reply-To.
 * @returns {Promise<object>} Nodemailer sendMail response object
 */
const sendEmail = async ({ to, subject, html, replyTo }) => {
    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM.match(/<(.*)>/)[1]}>`, // Extract email from "Name <email@example.com>"
        to: to,
        subject: subject,
        html: html,
    };

    if (replyTo) {
        mailOptions.replyTo = replyTo;
    }

    console.log("Attempting to send email with options:", mailOptions);
    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error; // Re-throw to be caught by controller
    }
};

module.exports = { sendEmail };
