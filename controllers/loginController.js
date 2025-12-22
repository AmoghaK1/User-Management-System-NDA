require('dotenv').config();
const {
    handleUserRegistration,
    sendSignupOtp,
    verifySignupOtp,
    requestPasswordResetOtp,
    resendPasswordResetOtp,
    completePasswordResetWithOtp
} = require('../services/loginService');
const { maskPhoneNumber } = require('../services/otpService');

const loadRegister = async(req,res)=> {
    try {
        res.render('login/signup', { error: null, formData: {} }); // Always pass an empty formData object
    } catch (error) {
        console.log(error.message);
    }

}

const addUser = async (req, res) => {
    try {
        console.log('[addUser] Registration attempt:', {
            email: req.body.email,
            name: req.body.name,
            hasPassword: !!req.body.password,
            hasAllFields: !!(req.body.name && req.body.email && req.body.birthdate && req.body.password)
        });

        const result = await handleUserRegistration(req.body);

        if (!result.success) {
            console.error('[addUser] Registration failed:', result.message);
            req.flash('formData', req.body);
            return res.redirect(`/signup?error=${encodeURIComponent(result.message)}`);
        }

        const otpResult = await sendSignupOtp(result.user._id);
        const maskedPhone = otpResult.maskedPhone || maskPhoneNumber(result.user.student_ph_no || '');

        req.session.pendingSignup = {
            userId: result.user._id.toString(),
            email: result.user.email,
            maskedPhone
        };

        if (!otpResult.success) {
            console.error('[addUser] OTP dispatch failed:', otpResult.message);
            req.session.pendingSignupError = otpResult.message || 'Unable to send OTP. Please try again.';
        } else {
            console.log('[addUser] Registration successful, OTP sent:', {
                email: result.user.email,
                maskedPhone
            });
        }

        return res.redirect('/signup/verify-otp');
    } catch (error) {
        console.error('❌ [addUser] CRITICAL ERROR:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Request body:', JSON.stringify(req.body, null, 2));
        req.flash('formData', req.body);
        return res.redirect('/signup?error=Something%20went%20wrong.%20Try%20again%20later.');
    }
};


const loadLogin = async (req, res) => {
    const successMessage = req.session.authSuccessMessage || req.query.success || null;
    const errorMessage = req.query.error || null;

    if (req.session.authSuccessMessage) {
        delete req.session.authSuccessMessage;
    }

    res.render('login/login', { error: errorMessage, success: successMessage });
};

const loadSignupOtp = (req, res) => {
    const pending = req.session.pendingSignup;
    if (!pending) {
        return res.redirect('/signup');
    }

    const initialError = req.session.pendingSignupError || null;
    if (req.session.pendingSignupError) {
        delete req.session.pendingSignupError;
    }

    return res.render('login/signup-otp', {
        error: initialError,
        success: null,
        email: pending.email,
        maskedPhone: pending.maskedPhone
    });
};

const verifySignupOtpController = async (req, res) => {
    const pending = req.session.pendingSignup;
    if (!pending) {
        return res.redirect('/signup');
    }

    try {
        const { otpCode } = req.body;
        const result = await verifySignupOtp(pending.userId, otpCode);

        if (!result.success) {
            return res.render('login/signup-otp', {
                error: result.message,
                success: null,
                email: pending.email,
                maskedPhone: pending.maskedPhone
            });
        }

        delete req.session.pendingSignup;
        req.session.authSuccessMessage = 'Phone number verified successfully. You can now log in.';
        return res.redirect('/login');
    } catch (error) {
        console.error('[verifySignupOtpController] Error verifying OTP:', error);
        return res.render('login/signup-otp', {
            error: 'Failed to verify OTP. Please try again.',
            success: null,
            email: pending.email,
            maskedPhone: pending.maskedPhone
        });
    }
};

const resendSignupOtp = async (req, res) => {
    const pending = req.session.pendingSignup;
    if (!pending) {
        return res.redirect('/signup');
    }

    try {
        const result = await sendSignupOtp(pending.userId);
        if (!result.success) {
            return res.render('login/signup-otp', {
                error: result.message,
                success: null,
                email: pending.email,
                maskedPhone: pending.maskedPhone
            });
        }

        req.session.pendingSignup.maskedPhone = result.maskedPhone;

        return res.render('login/signup-otp', {
            error: null,
            success: 'A new OTP has been sent to your phone.',
            email: pending.email,
            maskedPhone: result.maskedPhone
        });
    } catch (error) {
        console.error('[resendSignupOtp] Error resending OTP:', error);
        return res.render('login/signup-otp', {
            error: 'Unable to resend OTP right now. Please try again later.',
            success: null,
            email: pending.email,
            maskedPhone: pending.maskedPhone
        });
    }
};

const loadForgotPassword = async (req, res) => {
    try {
        const context = req.session.passwordReset || {};
        res.render('login/forgot-password', {
            error: null,
            success: null,
            otpSent: Boolean(context.userId),
            maskedPhone: context.maskedPhone || null,
            emailValue: context.email || ''
        });
    } catch (error) {
        console.error('Forgot password load error:', error);
        res.render('login/login', {
            error: 'Error loading forgot password page',
            success: null
        });
    }
};

const forgotPassword = async (req, res) => {
    const intent = req.body.intent || 'request';
    const sessionContext = req.session.passwordReset || {};

    try {
        if (intent === 'request') {
            const { email } = req.body;
            const result = await requestPasswordResetOtp(email);

            if (!result.success) {
                return res.render('login/forgot-password', {
                    error: result.message,
                    success: null,
                    otpSent: false,
                    maskedPhone: null,
                    emailValue: email || ''
                });
            }

            req.session.passwordReset = {
                userId: result.userId,
                maskedPhone: result.maskedPhone,
                email: result.email
            };

            return res.render('login/forgot-password', {
                error: null,
                success: 'OTP sent to your registered phone number.',
                otpSent: true,
                maskedPhone: result.maskedPhone,
                emailValue: result.email
            });
        }

        if (intent === 'resend') {
            if (!sessionContext.userId) {
                return res.render('login/forgot-password', {
                    error: 'Password reset session expired. Please request a new OTP.',
                    success: null,
                    otpSent: false,
                    maskedPhone: null,
                    emailValue: ''
                });
            }

            const result = await resendPasswordResetOtp(sessionContext.userId);

            if (!result.success) {
                return res.render('login/forgot-password', {
                    error: result.message,
                    success: null,
                    otpSent: true,
                    maskedPhone: sessionContext.maskedPhone,
                    emailValue: sessionContext.email
                });
            }

            req.session.passwordReset.maskedPhone = result.maskedPhone;

            return res.render('login/forgot-password', {
                error: null,
                success: 'A new OTP has been sent.',
                otpSent: true,
                maskedPhone: result.maskedPhone,
                emailValue: sessionContext.email
            });
        }

        if (!sessionContext.userId) {
            return res.render('login/forgot-password', {
                error: 'Password reset session expired. Please request a new OTP.',
                success: null,
                otpSent: false,
                maskedPhone: null,
                emailValue: ''
            });
        }

        const { otpCode, password, confirmPassword } = req.body;
        const result = await completePasswordResetWithOtp({
            userId: sessionContext.userId,
            otpCode,
            password,
            confirmPassword
        });

        if (!result.success) {
            return res.render('login/forgot-password', {
                error: result.message,
                success: null,
                otpSent: true,
                maskedPhone: sessionContext.maskedPhone,
                emailValue: sessionContext.email
            });
        }

        delete req.session.passwordReset;
        req.session.authSuccessMessage = result.message;
        return res.redirect('/login');
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.render('login/forgot-password', {
            error: 'Error processing your request',
            success: null,
            otpSent: Boolean(sessionContext.userId),
            maskedPhone: sessionContext.maskedPhone || null,
            emailValue: sessionContext.email || ''
        });
    }
};

module.exports = {
    loadRegister,
    addUser,
    loadLogin,
    loadSignupOtp,
    verifySignupOtp: verifySignupOtpController,
    resendSignupOtp,
    loadForgotPassword,
    forgotPassword
};