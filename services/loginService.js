const User = require('../models/userModel');
const UserPG = require('../models/pg/userModel');
const PaymentStatusPG = require('../models/pg/paymentModel');
const { Op } = require('sequelize');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const userVerification = require('../models/userVerification');
const crypto = require('crypto');
const PaymentStatus = require('../models/paymentModel');

const getResetPasswordData = async (token) => {
    try {
        // Check PostgreSQL first
        const user = await UserPG.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { [Op.gt]: new Date() }
            }
        });

        if (!user) {
            return {
                user: null,
                error: 'Password reset token is invalid or has expired.'
            };
        }

        return {
            user,
            token
        };

    } catch (err) {
        console.error('Service error in getResetPasswordData:', err);
        throw new Error('Internal Service Error');
    }
};

const getVerifiedEmail = async (userId , uniqueString) => {
    let session = null;
    try {
            console.log('[getVerifiedEmail] Starting verification', {
                userId,
                uniqueStringPreview: uniqueString ? `${uniqueString.slice(0, 8)}...${uniqueString.slice(-6)}` : null
            });
            if (!userId || !uniqueString || !mongoose.Types.ObjectId.isValid(userId)) {
                console.warn('[getVerifiedEmail] Invalid link format', { userId, uniqueStringPresent: !!uniqueString });
                return {
                    success: false,
                    message: "Invalid verification link format."
                };
            }
    
            // Start transaction to prevent race conditions
            session = await mongoose.startSession();
            session.startTransaction();
    
            // Find verification record
            const verificationRecord = await userVerification.findOne({ userId }).session(session);
            console.log('[getVerifiedEmail] Verification record lookup', {
                userId,
                recordFound: !!verificationRecord,
                expiresAt: verificationRecord ? verificationRecord.expiresAt : null
            });
            
            if (!verificationRecord) {
                // Delete user record if verification record not found
                console.warn('[getVerifiedEmail] No verification record found', { userId });
                await User.deleteOne({ _id: userId }).session(session);
                await session.commitTransaction();
                return {
                    success: false,
                    message: "Verification record not found or already used. Please register again."
                };
            }
    
            // Check expiration
            if (verificationRecord.expiresAt < Date.now()) {
                console.warn('[getVerifiedEmail] Verification link expired', { userId, expiresAt: verificationRecord.expiresAt });
                await User.deleteOne({ _id: userId }).session(session);
                await userVerification.deleteOne({ userId }).session(session);
                await session.commitTransaction();
                return{
                    success: false,
                    message: "Verification link has expired. Please register again."
                };
            }
    
            // Compare unique strings
            const isValid = await bcrypt.compare(uniqueString, verificationRecord.uniqueString);
            console.log('[getVerifiedEmail] Unique string comparison', { userId, isValid });
            
            if (!isValid) {
                // Delete user record if verification string is invalid
                console.warn('[getVerifiedEmail] Unique string mismatch', { userId });
                await User.deleteOne({ _id: userId }).session(session);
                await userVerification.deleteOne({ userId }).session(session);
                await session.commitTransaction();
                return{
                    success: false,
                    message: "Invalid verification link. Please register again."
                };
            }
    
            // Check if user exists
            const user = await User.findById(userId).session(session);
            console.log('[getVerifiedEmail] User lookup', { userFound: !!user, userId });
            if (!user) {
                await userVerification.deleteOne({ userId }).session(session);
                await session.commitTransaction();
                return {
                    success: false,
                    message: "User account not found. Please register again."
                };
            }
    
            // Skip if already verified
            if (user.is_verified) {
                console.warn('[getVerifiedEmail] User already verified', { userId });
                await userVerification.deleteOne({ userId }).session(session);
                await session.commitTransaction();
                return {
                    success: false,
                    message: "Email was already verified. You can now log in."
                };
            }
    
            // Update and save user
            user.is_verified = true;
            user.verifiedAt = new Date();
            await user.save({ session });
            
            // Clean up verification record
            await userVerification.deleteOne({ userId }).session(session);
            await session.commitTransaction();
    
            // Successful verification
            console.log('[getVerifiedEmail] Verification successful', { userId });
            return {
                success: true,
                message: "Email verified successfully! You can now log in.",
                redirectUrl: '/login'
            };
    
        } catch (error) {
        console.error('[getVerifiedEmail] Verification error', { userId, error });
        if (session) await session.abortTransaction();

        // Cleanup in case of failure
        try {
            await User.deleteOne({ _id: userId });
            await userVerification.deleteOne({ userId });
        } catch (cleanupErr) {
            console.error("Cleanup failed after verification error:", cleanupErr);
        }

        throw error;
    } finally {
        if (session) await session.endSession();
    }
};

const getresetPassword = async (token, password, confirmPassword) => {
    try {
        // Find user by token and check expiry in PostgreSQL
        const user = await UserPG.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { [Op.gt]: new Date() }
            }
        });

        if (!user) {
            return { 
                success: false,
                error: 'Password reset token is invalid or has expired.',
            };
        }

        // Validate passwords
        if (password !== confirmPassword) {
            return { 
                success: false,
                error: 'Passwords do not match',
            };
        }

        if (password.length < 5) {
            return{ 
                token,
                error: 'Password must be at least 5 characters',
                success: false
            };
        }

        const passwordRegex = /^(?=.*\d).{5,}$/;
        if (!passwordRegex.test(password)) {
            return { 
                token,
                error: 'Password must be at least 5 characters long and contain at least one number',
                success: false
            };
        }

        // Hash new password and update user
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        return { 
            success: true,
            message: 'Password has been reset successfully. You can now log in.',
        };
        
    } catch (error) {
       console.error('Error in getresetPassword:', error);
       throw error;
    }
};


const getForgotPassword = async (email) => {
    try{
     // Find user by email in PostgreSQL
            const user = await UserPG.findOne({ where: { email } });
            if (!user) {
                return { 
                    success: false,
                    message: 'No account with that email exists.'
                };
            }
    
            // Generate token and set expiry (1 hour from now)
            const token = crypto.randomBytes(20).toString('hex');
            user.resetPasswordToken = token;
            user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
            await user.save();
            const currentUrl = process.env.CURRENT_URL;
            // Send email
            const resetUrl = `${currentUrl}/reset-password/${token}`; // || `${req.protocol}://${req.get('host')}/reset-password/${token}`
            
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
                subject: 'Reset Your Password - Nrutyashree Dance Academy',
                text: `Hello,\n\nYou requested a password reset for your Nrutyashree Dance Academy account.\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email. Your password will remain unchanged.\n\nBest regards,\nNrutyashree Dance Academy Team\n\nUnsubscribe: ${currentUrl}/unsubscribe`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Password Reset - Nrutyashree Dance Academy</title>
                    </head>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h1 style="color: white; margin: 0;">Password Reset Request</h1>
                        </div>
                        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                            <p style="font-size: 16px;">Hello,</p>
                            <p style="font-size: 16px;">You requested a password reset for your Nrutyashree Dance Academy account.</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px;">Reset Your Password</a>
                            </div>
                            <p style="font-size: 14px; color: #666;">Or copy and paste this link in your browser:</p>
                            <p style="font-size: 14px; word-break: break-all; background: #e9e9e9; padding: 10px; border-radius: 5px;">${resetUrl}</p>
                            <p style="font-size: 14px; color: #999; margin-top: 30px;">This link will expire in 1 hour for security reasons.</p>
                            <p style="font-size: 14px; color: #999;">If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                            <p style="font-size: 14px; color: #666;">
                                Best regards,<br>
                                <strong>Nrutyashree Dance Academy Team</strong><br>
                                <a href="mailto:${process.env.AUTH_EMAIL}" style="color: #667eea;">${process.env.AUTH_EMAIL}</a>
                            </p>
                        </div>
                    </body>
                    </html>
                `,
                // Anti-spam headers and settings
                categories: ['password-reset', 'transactional'],
                customArgs: {
                    'user_id': user._id.toString(),
                    'email_type': 'password_reset'
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
                }
            };
    
            try {
                await sgMail.send(msg);
                console.log('Password reset email sent successfully to:', user.email);
            } catch (error) {
                console.error('Failed to send password reset email:', error);
                throw error;
            }
            return {
                success: true,
                message: 'An email has been sent with password reset instructions.'
            };
            
        } catch (error) {
           console.error('Error in getForgotPassword:', error);
            throw error;
        }
};

const initializePaymentStatus = async (userId) => {
    const currentYear = new Date().getFullYear();
    const user = await UserPG.findByPk(userId);
    if (!user) throw new Error('User not found during payment init');

    // Check if payment status already exists
    const existingPayment = await PaymentStatusPG.findOne({
        where: {
            userId,
            year: currentYear
        }
    });

    if (!existingPayment) {
        await PaymentStatusPG.create({
            userId,
            userName: user.name,
            year: currentYear
        });
    }
};


const handleUserRegistration = async (data) => {
    try {    
     const { name, email, birthdate, age, student_ph_no, exam_level, mother_ph_no, father_ph_no, password, confirmPassword } = data;
            
            // Check if email already exists in PostgreSQL
            const existingUserPG = await UserPG.findOne({ where: { email } });
            if (existingUserPG) {
                return { success: false, message: 'Email already registered' };
            }
            
            // Check if passwords match
            if (password !== confirmPassword) {
                return { success: false, message: "Passwords don't match" };
            }
    
            // Validate Email Format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
               return { success: false, message: 'Invalid email format' };
            }
            
            // Validate birthdate
            if (!birthdate) {
                return { success: false, message: 'Birthdate is required' };
            }
            
            const birthdateObj = new Date(birthdate);
            if (isNaN(birthdateObj.getTime())) {
                return { success: false, message: 'Invalid birthdate format' };
            }
            
            // Check if birthdate is in the future
            if (birthdateObj > new Date()) {
                return { success: false, message: 'Birthdate cannot be in the future' };
            }
            
            // Check if birthdate is reasonable (not more than 100 years ago)
            const hundredYearsAgo = new Date();
            hundredYearsAgo.setFullYear(hundredYearsAgo.getFullYear() - 100);
            if (birthdateObj < hundredYearsAgo) {
                return { success: false, message: 'Birthdate cannot be more than 100 years ago' };
            }
            
            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);
    
            // Create new user in PostgreSQL ONLY
            const userPG = await UserPG.create({
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
                is_verified: true  // BYPASSING EMAIL VERIFICATION - Auto-verify users
            });
            
            // Initialize payment status in PostgreSQL
            await initializePaymentStatus(userPG.id);
            
            console.log(`✅ SUCCESS: User ${userPG.email} registered in PostgreSQL (ID: ${userPG.id})`);
            
            return { success: true, userId: userPG.id };
        } catch (error) {
            console.error("Service error in handleUserRegistration:", error);
            throw error;
        }
}

module.exports = { 
    getResetPasswordData ,
    getVerifiedEmail , 
    getresetPassword , 
    getForgotPassword , 
    handleUserRegistration 
};
