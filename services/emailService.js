const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const sgMail = require('../config/sendgrid');
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
        console.warn('Failed to attach logo:', err);
    }

    // Save verification data first
    const hashedUniqueString = await bcrypt.hash(uniqueString, 10);
    await new userVerification({
        userId: user._id,
        uniqueString: hashedUniqueString,
        createdAt: Date.now(),
        expiresAt: Date.now() + 6 * 60 * 60 * 1000 // 6 hours
    }).save();

    // Prepare SendGrid message with anti-spam configurations
    const msg = {
        to: user.email,
        from: {
            email: process.env.AUTH_EMAIL,
            name: 'Nrutyashree Dance Academy'
        },
        replyTo: {
            email: process.env.AUTH_EMAIL,
            name: 'Nrutyashree Dance Academy Support'
        },
        subject: 'Complete Your Registration - Nrutyashree Dance Academy',
        html: emailHtml,
        text: `Hello ${user.name || 'User'},\n\nWelcome to Nrutyashree Dance Academy!\n\nPlease verify your email address by clicking the link below:\n${verificationLink}\n\nThis link will expire in 6 hours.\n\nIf you didn't create this account, please ignore this email.\n\nBest regards,\nNrutyashree Dance Academy Team\n\nUnsubscribe: ${currentUrl}/unsubscribe`,
        // Anti-spam headers and settings
        categories: ['email-verification', 'transactional'],
        customArgs: {
            'user_id': user._id.toString(),
            'email_type': 'verification'
        },
        trackingSettings: {
            clickTracking: {
                enable: true,
                enableText: false
            },
            openTracking: {
                enable: true
            },
            subscriptionTracking: {
                enable: false
            }
        },
        mailSettings: {
            sandboxMode: {
                enable: false
            }
        },
        // Note: SendGrid handles attachments differently
        // For embedded images, we'll need to convert to base64
        attachments: attachments.length > 0 ? attachments.map(att => ({
            filename: att.filename,
            content: require('fs').readFileSync(att.path).toString('base64'),
            type: 'image/png',
            disposition: 'inline',
            content_id: att.cid
        })) : []
    };

    try {
        await sgMail.send(msg);
        console.log('Verification email sent successfully to:', user.email);
    } catch (error) {
        console.error('Failed to send verification email:', error);
        throw error;
    }
};

module.exports = { sendVerification };
