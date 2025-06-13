const User = require('../models/userModel');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const userVerification = require('../models/userVerification');
const crypto = require('crypto');
const transporter = require('../config/nodemailer');
const { sendVerification } = require('../services/emailService');
const PaymentStatus = require('../models/paymentModel');

const getResetPasswordData = async (token) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
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

const getVerifiedEmail = async (req, res) => {
    let session = null;
    try {
            if (!userId || !uniqueString || !mongoose.Types.ObjectId.isValid(userId)) {
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
            
            if (!verificationRecord) {
                // Delete user record if verification record not found
                await User.deleteOne({ _id: userId }).session(session);
                await session.commitTransaction();
                return {
                    success: false,
                    message: "Verification record not found or already used. Please register again."
                };
            }
    
            // Check expiration
            if (verificationRecord.expiresAt < Date.now()) {
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
            
            if (!isValid) {
                // Delete user record if verification string is invalid
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
            return {
                success: true,
                message: "Email verified successfully! You can now log in.",
                redirectUrl: '/login'
            };
    
        } catch (error) {
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
        // Find user by token and check expiry
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
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

        if (password.length < 8) {
            return{ 
                token,
                error: 'Password must be at least 8 characters',
                success: false
            };
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return { 
                token,
                error: 'Password must be at least 8 characters long, contain uppercase, lowercase, number, and special character',
                success: false
            };
        }

        // Hash new password and update user
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
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
     // Find user by email
            const user = await User.findOne({ email });
            if (!user) {
                return { 
                    success: false,
                    message: 'No account with that email exists.'
                };
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
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found during payment init');

    await PaymentStatus.findOneAndUpdate(
        { userId, year: currentYear },
        {
            $setOnInsert: {
                userName: user.name,
                months: Object.fromEntries([...Array(12).keys()].map(m => [m, 'Pending'])),
                quarters: { 1: 'Pending', 2: 'Pending', 3: 'Pending', 4: 'Pending' }
            }
        },
        { upsert: true, new: true }
    );
};


const handleUserRegistration = async (data) => {
    try {    
     const { name, email, birthdate, age, student_ph_no, exam_level, mother_ph_no, father_ph_no, password, confirmPassword } = data;
            // Check if email already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
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
                await sendVerification(userData);
            } catch (emailError) {
                console.error("Verification email error:", emailError);
                await User.deleteOne({ _id: userData._id });
                return  { 
                    success: false, 
                    message: 'Failed to send verification email. Please try again later.' };
            }
            return { success: true };
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
