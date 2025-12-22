const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const PaymentStatus = require('../models/paymentModel');
const otpService = require('./otpService');

const PASSWORD_REGEX = /^(?=.*\d).{5,}$/;

const validatePasswordPair = (password, confirmPassword) => {
    if (password !== confirmPassword) {
        return "Passwords don't match";
    }

    if (password.length < 5) {
        return 'Password must be at least 5 characters';
    }

    if (!PASSWORD_REGEX.test(password)) {
        return 'Password must be at least 5 characters long and contain at least one number';
    }

    return null;
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


const PHONE_REGEX = /^[0-9+\-()\s]{7,15}$/;

const normalizePhoneInput = (value = '') => value.toString().trim();

const handleUserRegistration = async (data) => {
    try {
        const { name, email, birthdate, age, student_ph_no, exam_level, password, confirmPassword } = data;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return { success: false, message: 'Email already registered' };
        }

        const primaryPhone = normalizePhoneInput(student_ph_no);
        if (!primaryPhone || !PHONE_REGEX.test(primaryPhone)) {
            return { success: false, message: 'A valid parent/student phone number is required for OTP verification.' };
        }

        const passwordError = validatePasswordPair(password, confirmPassword);
        if (passwordError) {
            return { success: false, message: passwordError };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { success: false, message: 'Invalid email format' };
        }

        if (!birthdate) {
            return { success: false, message: 'Birthdate is required' };
        }

        const birthdateObj = new Date(birthdate);
        if (isNaN(birthdateObj.getTime())) {
            return { success: false, message: 'Invalid birthdate format' };
        }

        if (birthdateObj > new Date()) {
            return { success: false, message: 'Birthdate cannot be in the future' };
        }

        const hundredYearsAgo = new Date();
        hundredYearsAgo.setFullYear(hundredYearsAgo.getFullYear() - 100);
        if (birthdateObj < hundredYearsAgo) {
            return { success: false, message: 'Birthdate cannot be more than 100 years ago' };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            birthdate,
            age,
            student_ph_no: primaryPhone,
            exam_level,
            password: hashedPassword,
            is_admin: 0,
            is_verified: false
        });

        const userData = await user.save();

        await initializePaymentStatus(userData._id);

        console.log(`✅ SUCCESS: User ${userData.email} registered successfully (OTP verification pending)`);

        return { success: true, user: userData };
    } catch (error) {
        console.error('Service error in handleUserRegistration:', error);
        throw error;
    }
};

const sendSignupOtp = async (userId) => {
    let maskedPhone;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return { success: false, message: 'Account not found. Please register again.' };
        }

        if (!user.student_ph_no) {
            return { success: false, message: 'Phone number is required for OTP verification.' };
        }

        maskedPhone = otpService.maskPhoneNumber(user.student_ph_no);
        await otpService.sendOtp({ phoneNumber: user.student_ph_no });

        return {
            success: true,
            maskedPhone,
            email: user.email
        };
    } catch (error) {
        console.error('[sendSignupOtp] Failed to send OTP:', error);
        return { success: false, message: 'Failed to send OTP. Please try again.', maskedPhone };
    }
};

const verifySignupOtp = async (userId, otpCode) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            return { success: false, message: 'Account not found. Please register again.' };
        }

        if (user.is_verified) {
            return { success: true, message: 'Account already verified.' };
        }

        const approved = await otpService.verifyOtp({
            phoneNumber: user.student_ph_no,
            code: otpCode
        });

        if (!approved) {
            return { success: false, message: 'Invalid or expired OTP. Please try again.' };
        }

        user.is_verified = true;
        user.verifiedAt = new Date();
        await user.save();

        return { success: true };
    } catch (error) {
        console.error('[verifySignupOtp] Failed to verify OTP:', error);
        return { success: false, message: 'Failed to verify OTP. Please try again later.' };
    }
};

const requestPasswordResetOtp = async (email) => {
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return { success: false, message: 'No account with that email exists.' };
        }

        if (!user.student_ph_no) {
            return { success: false, message: 'No phone number is linked to this account.' };
        }

        await otpService.sendOtp({ phoneNumber: user.student_ph_no });

        return {
            success: true,
            userId: user._id.toString(),
            maskedPhone: otpService.maskPhoneNumber(user.student_ph_no),
            email: user.email
        };
    } catch (error) {
        console.error('[requestPasswordResetOtp] Failed to send OTP:', error);
        return { success: false, message: 'Failed to send OTP. Please try again later.' };
    }
};

const resendPasswordResetOtp = async (userId) => {
    let maskedPhone;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return { success: false, message: 'Password reset session expired. Please start again.' };
        }

        maskedPhone = otpService.maskPhoneNumber(user.student_ph_no);
        await otpService.sendOtp({ phoneNumber: user.student_ph_no });

        return {
            success: true,
            maskedPhone
        };
    } catch (error) {
        console.error('[resendPasswordResetOtp] Failed to resend OTP:', error);
        return { success: false, message: 'Failed to resend OTP. Please try again later.', maskedPhone };
    }
};

const completePasswordResetWithOtp = async ({ userId, otpCode, password, confirmPassword }) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            return { success: false, message: 'Password reset session expired. Please request a new OTP.' };
        }

        const approved = await otpService.verifyOtp({
            phoneNumber: user.student_ph_no,
            code: otpCode
        });

        if (!approved) {
            return { success: false, message: 'Invalid or expired OTP. Please try again.' };
        }

        const passwordError = validatePasswordPair(password, confirmPassword);
        if (passwordError) {
            return { success: false, message: passwordError };
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        await user.save();

        return { success: true, message: 'Password updated successfully. You can now log in.' };
    } catch (error) {
        console.error('[completePasswordResetWithOtp] Failed to reset password:', error);
        return { success: false, message: 'Failed to reset password. Please try again later.' };
    }
};

module.exports = {
    handleUserRegistration,
    sendSignupOtp,
    verifySignupOtp,
    requestPasswordResetOtp,
    resendPasswordResetOtp,
    completePasswordResetWithOtp
};
