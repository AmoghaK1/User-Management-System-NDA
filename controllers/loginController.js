const User = require('../models/userModel');
const path = require('path')
const bcrypt = require('bcrypt');
const fs = require('fs');
require("dotenv").config();
const PaymentStatus = require('../models/paymentModel');
const userVerification = require('../models/userVerification');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid'); 
const mongoose = require('mongoose')
const crypto = require('crypto');


let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.log(error);
    }
    else {
        console.log('Nodemailer Active');
    }
});

const loadRegister = async(req,res)=> {
    try {
        res.render('signup', { error: null, formData: {} }); // Always pass an empty formData object
    } catch (error) {
        console.log(error.message);
    }

}

async function initializePaymentStatus(userId) {
    const currentYear = new Date().getFullYear();
    
    // Fetch user details to get the name
    const user = await User.findById(userId);
    if (!user) {
        console.error("User not found for ID:", userId);
        return;
    }

    // Create or update PaymentStatus for the current year
    await PaymentStatus.findOneAndUpdate(
        { 
            userId, 
            year: currentYear 
        },
        {
            $setOnInsert: {
                userName: user.name,  // Store user name
                months: {
                    0: 'Pending', 1: 'Pending', 2: 'Pending', 3: 'Pending',
                    4: 'Pending', 5: 'Pending', 6: 'Pending', 7: 'Pending',
                    8: 'Pending', 9: 'Pending', 10: 'Pending', 11: 'Pending'
                },
                quarters: {
                    1: 'Pending', 2: 'Pending', 3: 'Pending', 4: 'Pending'
                }
            }
        }, 
        { 
            upsert: true, 
            new: true 
        }
    );
}

const addUser = async (req, res) => {
    try {
        const { name, email, birthdate, age, student_ph_no, exam_level, mother_ph_no, father_ph_no, password, confirmPassword } = req.body;

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('formData', req.body);
            
            return res.redirect('/signup?error=Email%20already%20registered');
        }
        
        // Check if passwords match
        if (password !== confirmPassword) {
            req.flash('formData', req.body);
            return res.redirect('/signup?error=Passwords%20don%27t%20match');
        }

        // Validate Email Format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            req.flash('formData', req.body);
            return res.redirect('/signup?error=Invalid%20email%20format');
        }
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = new User({
            name,
            email,
            birthdate,
            age,
            student_ph_no,
            exam_level,
            mother_ph_no,
            father_ph_no,
            password: hashedPassword,
            is_admin: 0,
            is_verified: false
        });

        const userData = await user.save();
        
        // Initialize payment status
        initializePaymentStatus(userData._id).catch(err => {
            console.error("Payment initialization error:", err);
        });

        // Send verification email
        try {
            await sendVerificationEmail(userData);
            return res.redirect('/signup?success=Registration%20successful!%20Please%20check%20your%20email%20for%20a%20verification%20link.');
        } catch (emailError) {
            console.error("Verification email error:", emailError);
            await User.deleteOne({ _id: userData._id });
            req.flash('formData', req.body);
            return res.redirect('/signup?error=Failed%20to%20send%20verification%20email.%20Please%20try%20again%20later.');
        }

    } catch (error) {
        console.error("Registration error:", error);
        req.flash('formData', req.body);
        return res.redirect('/signup?error=Something%20went%20wrong.%20Try%20again%20later.');
    }
};

const sendVerificationEmail = async (user) => {
    try {
        const currentUrl = process.env.CURRENT_URL;
        
        if (!currentUrl || !currentUrl.startsWith('http')) {
            throw new Error('Invalid CURRENT_URL in environment variables');
        }

        const uniqueString = uuidv4() + user._id;
        const verificationLink = `${currentUrl}/user/verify/${user._id}/${uniqueString}`;

        // Email template handling with proper error checking
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

        // Attachments handling
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

        // Hash the verification string
        const hashedUniqueString = await bcrypt.hash(uniqueString, 10);

        // Save verification record
        await new userVerification({
            userId: user._id,
            uniqueString: hashedUniqueString,
            createdAt: Date.now(),
            expiresAt: Date.now() + 21600000 // 6 hours
        }).save();
    
        // Send email
        await transporter.sendMail(mailOptions);

    } catch (error) {
        console.error("Verification email error:", error);
        // Consider cleaning up the user record if email fails
        // await User.deleteOne({ _id: user._id });
        throw error; // Re-throw to be caught by the caller
    }
};

const verifyEmail = async (req, res) => {
    let session = null;
    try {
        const { userId, uniqueString } = req.params;
        
        // Input validation
        if (!userId || !uniqueString || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.render('verifiedPage', {
                error: true,
                message: "Invalid verification link format."
            });
        }

        // Start transaction to prevent race conditions
        session = await mongoose.startSession();
        session.startTransaction();

        // Find verification record
        const verificationRecord = await userVerification.findOne({ userId }).session(session);
        
        if (!verificationRecord) {
            // Delete user record if verification record not found
            await User.deleteOne({ _id: userId }).session(session);
            await session.commitTransaction();
            return res.render('verifiedPage', {
                error: true,
                message: "Verification record not found or already used. Please register again."
            });
        }

        // Check expiration
        if (verificationRecord.expiresAt < Date.now()) {
            await User.deleteOne({ _id: userId }).session(session);
            await userVerification.deleteOne({ userId }).session(session);
            await session.commitTransaction();
            return res.render('verifiedPage', {
                error: true,
                message: "Verification link has expired. Please register again."
            });
        }

        // Compare unique strings
        const isValid = await bcrypt.compare(uniqueString, verificationRecord.uniqueString);
        
        if (!isValid) {
            // Delete user record if verification string is invalid
            await User.deleteOne({ _id: userId }).session(session);
            await userVerification.deleteOne({ userId }).session(session);
            await session.commitTransaction();
            return res.render('verifiedPage', {
                error: true,
                message: "Invalid verification link. Please register again."
            });
        }

        // Check if user exists
        const user = await User.findById(userId).session(session);
        if (!user) {
            await userVerification.deleteOne({ userId }).session(session);
            await session.commitTransaction();
            return res.render('verifiedPage', {
                error: true,
                message: "User account not found. Please register again."
            });
        }

        // Skip if already verified
        if (user.is_verified) {
            await userVerification.deleteOne({ userId }).session(session);
            await session.commitTransaction();
            return res.render('verifiedPage', {
                error: false,
                message: "Email was already verified. You can now log in."
            });
        }

        // Update and save user
        user.is_verified = true;
        user.verifiedAt = new Date();
        await user.save({ session });
        
        // Clean up verification record
        await userVerification.deleteOne({ userId }).session(session);
        await session.commitTransaction();

        // Successful verification
        return res.render('verifiedPage', {
            error: false,
            message: "Email verified successfully! You can now log in.",
            redirectUrl: '/login'
        });

    } catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        console.error("Email verification error:", error);
        
        // Delete user data on any verification error
        if (req.params.userId) {
            try {
                await User.deleteOne({ _id: req.params.userId });
                await userVerification.deleteOne({ userId: req.params.userId });
            } catch (deleteErr) {
                console.error("Failed to delete user data after verification error:", deleteErr);
            }
        }
        
        return res.render('verifiedPage', {
            error: true,
            message: "An unexpected error occurred during verification. Please register again."
        });
    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

const loadVerifiedPage = async(req,res) => {
    res.render("verifiedPage");
}

const loadLogin = async(req,res) => {
    res.render('login', { error: null, success: null }); // Ensures both variables are always defined
};

const loadForgotPassword = async (req, res) => {
    try {
        res.render('forgot-password', { 
            error: null,
            success: null 
        });
    } catch (error) {
        console.error('Forgot password load error:', error);
        res.render('login', { 
            error: 'Error loading forgot password page',
            success: null
        });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('forgot-password', { 
                error: 'No account with that email exists.',
                success: null
            });
        }

        // Generate token and set expiry (1 hour from now)
        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();
        const currentUrl = process.env.CURRENT_URL;
        // Send email
        const resetUrl = `${currentUrl}/reset-password/${token}`; // || `${req.protocol}://${req.get('host')}/reset-password/${token}`
        
        const mailOptions = {
            to: user.email,
            from: process.env.AUTH_EMAIL,
            subject: 'Password Reset Request',
            text: `You are receiving this because you (or someone else) have requested a password reset for your account.\n\n
            Please click on the following link to reset your password:\n\n
            ${resetUrl}\n\n
            If you didn't request this, please ignore this email.\n`
        };

        await transporter.sendMail(mailOptions);
        
        res.render('forgot-password', { 
            success: 'An email has been sent with password reset instructions.',
            error: null
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.render('forgot-password', { 
            error: 'Error processing your request',
            success: null
        });
    }
};

const loadResetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        
        // Find user by token and check expiry
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.render('login', { 
                error: 'Password reset token is invalid or has expired.',
                success: null
            });
        }

        res.render('reset-password', { 
            token,
            error: null,
            success: null
        });
    } catch (error) {
        console.error('Reset password load error:', error);
        res.render('login', { 
            error: 'Error loading password reset page',
            success: null
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;

        // Find user by token and check expiry
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.render('login', { 
                error: 'Password reset token is invalid or has expired.',
                success: null
            });
        }

        // Validate passwords
        if (password !== confirmPassword) {
            return res.render('reset-password', { 
                token,
                error: 'Passwords do not match',
                success: null
            });
        }

        if (password.length < 8) {
            return res.render('reset-password', { 
                token,
                error: 'Password must be at least 8 characters',
                success: null
            });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.render('reset-password', { 
                token,
                error: 'Password must be at least 8 characters long, contain uppercase, lowercase, number, and special character',
                success: null
            });
        }

        // Hash new password and update user
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.render('login', { 
            success: 'Your password has been successfully updated.',
            error: null
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.render('reset-password', { 
            token: req.params.token,
            error: 'Error resetting password',
            success: null
        });
    }
};

module.exports = {
    loadRegister,
    addUser,
    loadLogin,
    loadVerifiedPage,
    verifyEmail,
    loadForgotPassword,
    forgotPassword,
    loadResetPassword,
    resetPassword
};