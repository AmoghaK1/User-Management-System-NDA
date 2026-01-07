const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const PaymentStatus = require('../models/paymentModel');

const PASSWORD_REGEX = /^(?=.*\d).{5,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const initializePaymentStatus = async (userId, userName) => {
    const currentYear = new Date().getFullYear();

    // Check if payment status already exists for this user and year
    const existingPaymentStatus = await PaymentStatus.findOne({ userid: userId, year: currentYear });
    
    if (!existingPaymentStatus) {
        // Create default months (0-11 as Pending)
        const defaultMonths = {};
        for (let i = 0; i < 12; i++) {
            defaultMonths[i] = 'Pending';
        }

        // Create default quarters (1-4 as Pending)
        const defaultQuarters = {
            1: 'Pending',
            2: 'Pending',
            3: 'Pending',
            4: 'Pending'
        };

        // Create default half yearly
        const defaultHalfYearly = {
            'half1': 'Pending',
            'half2': 'Pending'
        };

        await PaymentStatus.create({
            userid: userId,
            username: userName,
            year: currentYear,
            months: defaultMonths,
            quarters: defaultQuarters,
            halfyearly: defaultHalfYearly
        });
    }
};


const PHONE_REGEX = /^[0-9+\-()\s]{7,15}$/;

const normalizePhoneInput = (value = '') => value.toString().trim();
const normalizeEmailInput = (value = '') => value.toString().trim();

const handleUserRegistration = async (data) => {
    try {
        const { name, email, birthdate, age, student_ph_no, exam_level, password, confirmPassword } = data;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return { success: false, message: 'Email already registered' };
        }

        const primaryPhone = normalizePhoneInput(student_ph_no);
        if (!primaryPhone || !PHONE_REGEX.test(primaryPhone)) {
            return { success: false, message: 'A valid parent/student phone number is required to register.' };
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

        // Create user in Supabase
        const userData = await User.create({
            name,
            email,
            birthdate: birthdateObj.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
            age: parseInt(age, 10),
            student_ph_no: primaryPhone,
            exam_level,
            password: hashedPassword,
            is_admin: 0,
            is_verified: false,
            verifiedat: null
        });

        // Initialize payment status for the new user
        await initializePaymentStatus(userData.id, userData.name);

        return { success: true, user: userData };
    } catch (error) {
        console.error('Service error in handleUserRegistration:', error);
        throw error;
    }
};
const resetPasswordByEmail = async ({ email, password, confirmPassword }) => {
    try {
        const normalizedEmail = normalizeEmailInput(email);
        if (!normalizedEmail) {
            return { success: false, message: 'Email is required.' };
        }

        if (!EMAIL_REGEX.test(normalizedEmail)) {
            return { success: false, message: 'Enter a valid email address.' };
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return { success: false, message: 'No account found for that email.' };
        }

        if (!user.is_verified) {
            return {
                success: false,
                message: 'This email is not verified yet. Complete Google verification from your dashboard to enable password resets.'
            };
        }

        const passwordError = validatePasswordPair(password, confirmPassword);
        if (passwordError) {
            return { success: false, message: passwordError };
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.updateById(user.id, { password: hashedPassword });

        return { success: true, message: 'Password updated successfully. You can now log in.' };
    } catch (error) {
        console.error('[resetPasswordByEmail] Failed to reset password:', error);
        return { success: false, message: 'Failed to reset password. Please try again later.' };
    }
};

module.exports = {
    handleUserRegistration,
    resetPasswordByEmail
};
