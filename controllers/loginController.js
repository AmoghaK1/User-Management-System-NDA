require('dotenv').config();
const {
    handleUserRegistration,
    resetPasswordByPhone
} = require('../services/loginService');

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

        console.log('[addUser] Registration successful, phone verification skipped.');
        req.session.authSuccessMessage = 'Account created successfully. You can log in now.';
        return res.redirect('/login');
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

const loadForgotPassword = async (req, res) => {
    try {
        res.render('login/forgot-password', {
            error: null,
            success: null,
            phoneValue: ''
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
    try {
        const { phoneNumber, password, confirmPassword } = req.body;
        const result = await resetPasswordByPhone({ phoneNumber, password, confirmPassword });

        if (!result.success) {
            return res.render('login/forgot-password', {
                error: result.message,
                success: null,
                phoneValue: phoneNumber || ''
            });
        }

        req.session.authSuccessMessage = result.message;
        return res.redirect('/login');
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.render('login/forgot-password', {
            error: 'Error processing your request',
            success: null,
            phoneValue: req.body?.phoneNumber || ''
        });
    }
};

module.exports = {
    loadRegister,
    addUser,
    loadLogin,
    loadForgotPassword,
    forgotPassword
};