const sgMail = require('@sendgrid/mail');

// Set the API key for SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Verify API key is set
if (!process.env.SENDGRID_API_KEY) {
    console.error("SendGrid API key not found in environment variables");
} else {
    console.log('SendGrid ready');
}

module.exports = sgMail;require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.error("Nodemailer config error:", error);
    } else {
        console.log('Nodemailer ready');
    }
});

module.exports = transporter;
