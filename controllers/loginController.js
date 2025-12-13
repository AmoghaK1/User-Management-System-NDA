require("dotenv").config();
const { getResetPasswordData } = require('../services/loginService');
const { sendVerification } = require('../services/emailService');
const { getVerifiedEmail} = require('../services/loginService');
const { getresetPassword } = require('../services/loginService');
const { getForgotPassword } = require('../services/loginService');
const { handleUserRegistration } = require('../services/loginService');

const loadRegister = async(req,res)=> {
    try {
        res.render('login/signup', { error: null, formData: {} }); // Always pass an empty formData object
    } catch (error) {
        console.log(error.message);
    }

}

const addUser = async (req, res) => {
    try{
        const result = await handleUserRegistration(req.body);

        if (!result.success){
            req.flash('formData', req.body);
            return res.redirect(`/signup?error=${encodeURIComponent(result.message)}`);
        }

        return res.redirect(`/signup?success=Registration%20successful!%20You%20can%20now%20log%20in.`);
    }
    catch(error){
        console.error("Error in addUser:", error);
        req.flash('formData', req.body);
        return res.redirect('/signup?error=Something%20went%20wrong.%20Try%20again%20later.');
    }
};

const sendVerificationEmail = async (user) => {
    try{
       await sendVerification(user); 
    }catch (error) {    
        console.error("Error in sendVerificationEmail:", error);
        throw new Error('Failed to send verification email');
    }

};

const verifyEmail = async (req, res) => {
    try {
        const { userId , uniqueString} = req.params;
        console.log('[verifyEmail] Incoming verification request', {
            host: req.headers.host,
            protocol: req.protocol,
            userId,
            uniqueStringPreview: uniqueString ? `${uniqueString.slice(0, 8)}...${uniqueString.slice(-6)}` : null
        });
        const { success , message , redirectUrl} = await getVerifiedEmail(userId, uniqueString);

        console.log('[verifyEmail] Verification result', {
            userId,
            success,
            message,
            redirectUrl
        });

        return res.render('login/verifiedPage',{
            error: !success,
            message, 
            redirectUrl: success ? redirectUrl : undefined
        });
    }catch(error){
        console.error("Error verification controller error : ", error);

        return res.render('login/verifiedPage', {
            error: true,
            message: "An error occurred while verifying your email. Please try again later."
        });
    }
};

const loadVerifiedPage = async(req,res) => {
    res.render("login/verifiedPage");
}

const loadLogin = async(req,res) => {
    res.render('login/login', { error: null, success: null }); // Ensures both variables are always defined
};

const loadForgotPassword = async (req, res) => {
    try {
        res.render('login/forgot-password', { 
            error: null,
            success: null 
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
        const { email } = req.body;
        const result = await getForgotPassword(email);

        res.render('login/forgot-password', { 
            success: result.success ? result.message : null,
            error: result.success ? null : result.message
        });

    }catch(error){
        console.error('Forgot password error:', error);
        res.render('login/forgot-password', { 
        error: 'Error processing your request',
        success: null
    });
    }
};

const loadResetPassword = async (req, res) => {
    try {
        const { token } = req.params;

        const result = await getResetPasswordData(token);

        if (!result.user) {
            return res.render('login/login', { 
                error: result.error,
                success: null 
            });
        }

        res.render('login/reset-password', {
            token: result.token,
            error: null,
            success: null
        });

    } catch (error) {
        console.error('Reset password load error:', error);
        res.render('login/login', {
            error: 'Error loading password reset page',
            success: null
        });
    }
};

const resetPassword = async (req, res) => {
  try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;

        const result = await getresetPassword(token, password, confirmPassword);

        if (!result.success) {
            return res.render('login/reset-password', {
                token,
                error: result.message,
                success: null
            });
        }
        
        res.render('login/login', { 
            success: result.message,
            error: null
        });
  }
  catch(error){
     console.error('Reset password error:', error);
        res.render('login/reset-password', { 
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
    resetPassword,
    sendVerificationEmail
};