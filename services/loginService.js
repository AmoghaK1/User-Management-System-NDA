const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const PaymentStatus = require('../models/paymentModel');

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

        const user = new User({
            name,
            email,
            birthdate,
            age,
            student_ph_no: primaryPhone,
            exam_level,
            password: hashedPassword,
            is_admin: 0,
            is_verified: true,
            verifiedAt: new Date()
        });

        const userData = await user.save();

        await initializePaymentStatus(userData._id);

        console.log(`✅ SUCCESS: User ${userData.email} registered successfully (phone verification skipped)`);

        return { success: true, user: userData };
    } catch (error) {
        console.error('Service error in handleUserRegistration:', error);
        throw error;
    }
};
const resetPasswordByPhone = async ({ phoneNumber, password, confirmPassword }) => {
    try {
        const normalizedPhone = normalizePhoneInput(phoneNumber);
        if (!normalizedPhone) {
            return { success: false, message: 'Phone number is required.' };
        }

        const user = await User.findOne({ student_ph_no: normalizedPhone });
        if (!user) {
            return { success: false, message: 'No account found for that phone number.' };
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
        console.error('[resetPasswordByPhone] Failed to reset password:', error);
        return { success: false, message: 'Failed to reset password. Please try again later.' };
    }
};

module.exports = {
    handleUserRegistration,
    resetPasswordByPhone
};
