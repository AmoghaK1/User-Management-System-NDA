const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const transporter = require('../config/nodemailer'); // move transporter there
const userVerification = require('../models/userVerification');

const sendVerification = async (user) => {
    const currentUrl = process.env.CURRENT_URL;
    if (!currentUrl || !currentUrl.startsWith('http')) {
        throw new Error('Invalid CURRENT_URL in environment variables');
    }

    const uniqueString = uuidv4() + user._id;
    const verificationLink = `${currentUrl}/user/verify/${user._id}/${uniqueString}`;

    // Read HTML template
    let emailTemplate;
    try {
        const emailTemplatePath = path.resolve(__dirname, '../views/verificationEmail.html');
        emailTemplate = fs.readFileSync(emailTemplatePath, 'utf8');
    } catch (err) {
        console.error("Failed to read email template:", err);
        throw new Error('Failed to prepare verification email');
    }

    const emailHtml = emailTemplate
        .replace(/{{verificationLink}}/g, verificationLink)
        .replace(/{{rawLink}}/g, verificationLink)
        .replace(/{{userName}}/g, user.name || 'User');

    // Logo attachment
    const attachments = [];
    try {
        const imagePath = path.resolve(__dirname, '../public/images/natraj-logo.png');
        if (fs.existsSync(imagePath)) {
            attachments.push({
                filename: 'natraj-logo.png',
                path: imagePath,
                cid: 'natrajLogo'
            });
        }
    } catch (err) {
        console.warn('Failed to attach logo:', err);
    }

    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: user.email,
        subject: 'Verify Your Nrutyashree Dance Academy Account',
        html: emailHtml,
        attachments
    };

    // Save verification data
    const hashedUniqueString = await bcrypt.hash(uniqueString, 10);
    await new userVerification({
        userId: user._id,
        uniqueString: hashedUniqueString,
        createdAt: Date.now(),
        expiresAt: Date.now() + 6 * 60 * 60 * 1000 // 6 hours
    }).save();

    await transporter.sendMail(mailOptions);
};

module.exports = { sendVerification };
