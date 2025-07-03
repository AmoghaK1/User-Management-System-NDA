const nodemailer = require('nodemailer');

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
