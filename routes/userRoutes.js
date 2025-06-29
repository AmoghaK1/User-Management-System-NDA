const express = require('express');
const bodyParser = require('body-parser');
const user_route = express();
const config = require("../config/config")
const auth = require('../middlewares/auth');

user_route.use(bodyParser.json());
user_route.use(bodyParser.urlencoded({extended: true}));

const loginController = require('../controllers/loginController');
const studentController = require(`../controllers/studentController`);
const passport = require('passport');


// In userRoutes.js
user_route.get('/signup', auth.redirectIfAuthenticated, (req, res) => {
    // Get error and success from URL parameters
    const error = req.query.error || null;
    const success = req.query.success || null;
    const formData = req.flash('formData')[0] || {};
    
    
    res.render('login/signup', { 
        error, 
        success, 
        formData 
    });
});
user_route.post('/signup',  loginController.addUser);
user_route.get('/user/verify/:userId/:uniqueString', loginController.verifyEmail);
user_route.get('/verified', loginController.loadVerifiedPage);
user_route.get('/login', auth.redirectIfAuthenticated, loginController.loadLogin);

user_route.get('/forgot-password', auth.redirectIfAuthenticated, loginController.loadForgotPassword);
user_route.post('/forgot-password', loginController.forgotPassword);
user_route.get('/reset-password/:token', loginController.loadResetPassword);
user_route.post('/reset-password/:token', loginController.resetPassword);

user_route.post('/login', (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) return next(err);
        
        // If no user found or authentication fails
        if (!user) {
            return res.render("login/login", { error: info.message, success: null });
        }

        // Check if user is verified
        if (!user.is_verified && user.email != "rajjii11@gmail.com") {
            return res.render("login/login", { 
                error: "Please verify your email before logging in. Check your inbox for verification link.", 
                success: null 
            });
        }

        req.logIn(user, (err) => {
            if (err) return next(err);

            // Existing admin/user routing logic
            if (user.email === "rajjii11@gmail.com") {
                return res.redirect("/tr-dashboard");
            }

            return res.redirect("/st-dashboard");
        });
    })(req, res, next);
});

user_route.get('/st-dashboard', auth.ensureAuthenticated, studentController.load_stDashboard);
user_route.get('/logout', studentController.logout_user);
user_route.get('/st-profile', auth.ensureAuthenticated, studentController.loadProfile);
user_route.put('/api/profile/update', auth.ensureAuthenticated, studentController.updateProfile);
user_route.post('/api/profile/update-picture', auth.ensureAuthenticated, studentController.updateProfilePicture);
user_route.post('/api/profile/change-password', auth.ensureAuthenticated, studentController.changePassword);
user_route.get('/events', auth.ensureAuthenticated, studentController.loadEventsPage);
user_route.get('/study', auth.ensureAuthenticated, studentController.loadStudyPage);
user_route.get('/api/study-materials', auth.ensureAuthenticated, studentController.getStudyMaterials);
user_route.get('/certificates', auth.ensureAuthenticated, studentController.loadCertiPage);
user_route.get('/study-materials', auth.ensureAuthenticated, studentController.loadStudyPage);


module.exports = user_route;