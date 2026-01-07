const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const transporter = require('../config/nodeMailer');
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
        const emailTemplatePath = path.resolve(__dirname, '../views/login/verificationEmail.html');
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
            // Silently continue without logo if it fails

    // Save verification data first
    const hashedUniqueString = await bcrypt.hash(uniqueString, 10);
    await new userVerification({
        userId: user._id,
        uniqueString: hashedUniqueString,
        createdAt: Date.now(),
        expiresAt: Date.now() + 6 * 60 * 60 * 1000 // 6 hours
    }).save();

    // Prepare nodemailer message
    const mailOptions = {
        from: `"Nrutyashree Dance Academy" <${process.env.AUTH_EMAIL}>`,
        to: user.email,
        subject: 'Complete Your Registration - Nrutyashree Dance Academy',
        text: `Hello ${user.name || 'User'},\n\nWelcome to Nrutyashree Dance Academy!\n\nPlease verify your email address by clicking the link below:\n${verificationLink}\n\nThis link will expire in 6 hours.\n\nIf you didn't create this account, please ignore this email.\n\nBest regards,\nNrutyashree Dance Academy Team`,
        html: emailHtml,
        attachments: attachments
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Failed to send verification email:', error.message || error);
        throw error;
    }
};

module.exports = { sendVerification };
