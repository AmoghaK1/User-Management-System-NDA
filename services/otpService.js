const { client, verifyServiceSid, defaultCountryCode } = require('../config/twilio');

const sanitizeDigits = (value = '') => value.toString().replace(/[^0-9+]/g, '').trim();

const formatPhoneNumber = (rawValue = '') => {
    if (!rawValue) {
        throw new Error('Phone number is required for OTP delivery');
    }

    const trimmed = rawValue.toString().trim();

    if (trimmed.startsWith('+')) {
        return trimmed;
    }

    if (trimmed.startsWith('00')) {
        return `+${trimmed.slice(2)}`;
    }

    const numeric = sanitizeDigits(trimmed);
    const withoutLeadingZero = numeric.startsWith('0') ? numeric.slice(1) : numeric;
    return `${defaultCountryCode}${withoutLeadingZero}`;
};

const maskPhoneNumber = (rawValue = '') => {
    const digits = sanitizeDigits(rawValue);
    if (digits.length <= 4) {
        return digits;
    }
    const visible = digits.slice(-4);
    const maskedSection = '*'.repeat(Math.max(digits.length - 4, 0));
    return `${maskedSection}${visible}`;
};

const sendOtp = async ({ phoneNumber, channel = 'sms' }) => {
    const to = formatPhoneNumber(phoneNumber);
    const verification = await client.verify.v2.services(verifyServiceSid).verifications.create({ to, channel });
    return {
        to,
        status: verification.status
    };
};

const verifyOtp = async ({ phoneNumber, code }) => {
    const to = formatPhoneNumber(phoneNumber);
    const verificationCheck = await client.verify.v2.services(verifyServiceSid).verificationChecks.create({ to, code });
    return verificationCheck.status === 'approved';
};

module.exports = {
    sendOtp,
    verifyOtp,
    formatPhoneNumber,
    maskPhoneNumber
};
