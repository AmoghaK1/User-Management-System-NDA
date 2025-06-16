require("dotenv").config();
const { getResetPasswordData } = require('../services/loginService');
const { sendVerification } = require('../services/emailService');
const { getVerifiedEmail} = require('../services/loginService');
const { getresetPassword } = require('../services/loginService');
const { getForgotPassword } = require('../services/loginService');
const { handleUserRegistration } = require('../services/loginService');

const loadRegister = async(req,res)=> {
    try {
        res.render('signup', { error: null, formData: {} }); // Always pass an empty formData object
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

        return res.redirect(`/signup?success=Registration%20successful!%20Please%20check%20your%20email%20for%20a%20verification%20link.`);
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
        const { success , message , redirectUrl} = await getVerifiedEmail(userId, uniqueString);

        return res.render('verifiedPage',{
            error: !success,
            message, 
            redirectUrl: success ? redirectUrl : undefined
        });
    }catch(error){
        console.error("Error verification controller error : ", error);

        return res.render('verifiedPage', {
            error: true,
            message: "An error occurred while verifying your email. Please try again later."
        });
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
        const result = await getForgotPassword(email);

        res.render('forgot-password', { 
            success: result.success ? result.message : null,
            error: result.success ? null : result.message
        });

    }catch(error){
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

        const result = await getResetPasswordData(token);

        if (!result.user) {
            return res.render('login', { 
                error: result.error,
                success: null 
            });
        }

        res.render('reset-password', {
            token: result.token,
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

        const result = await getresetPassword(token, password, confirmPassword);

        if (!result.success) {
            return res.render('reset-password', {
                token,
                error: result.message,
                success: null
            });
        }
        
        res.render('login', { 
            success: result.message,
            error: null
        });
  }
  catch(error){
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
    resetPassword,
    sendVerificationEmail
};