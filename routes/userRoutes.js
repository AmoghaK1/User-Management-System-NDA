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
user_route.get('/login', auth.redirectIfAuthenticated, loginController.loadLogin);

user_route.get('/forgot-password', auth.redirectIfAuthenticated, loginController.loadForgotPassword);
user_route.post('/forgot-password', loginController.forgotPassword);

user_route.post('/login', (req, res, next) => {
    console.log('[Login Route] Login attempt:', { email: req.body.email });
    
    passport.authenticate("local", (err, user, info) => {
        if (err) {
            console.error('[Login Route] Error:', err);
            return next(err);
        }
        
        // If no user found or authentication fails
        if (!user) {
            console.log('[Login Route] Authentication failed:', info?.message);
            return res.render("login/login", { error: info.message, success: null });
        }

        req.logIn(user, (err) => {
            if (err) {
                console.error('[Login Route] Session creation error:', err);
                return next(err);
            }

            console.log('[Login Route] Login successful:', {
                email: user.email,
                sessionID: req.sessionID,
                isAuthenticated: req.isAuthenticated()
            });

            // Existing admin/user routing logic
            if (user.email === "rajjii11@gmail.com") {
                console.log('[Login Route] Redirecting to teacher dashboard');
                return res.redirect("/tr-dashboard");
            }

            console.log('[Login Route] Redirecting to student dashboard');
            return res.redirect("/st-dashboard");
        });
    })(req, res, next);
});

user_route.get('/st-dashboard', auth.ensureAuthenticated, (req, res, next) => {
    // Redirect teachers to teacher dashboard
    if (req.user && req.user.email === "rajjii11@gmail.com") {
        return res.redirect("/tr-dashboard");
    }
    next();
}, studentController.load_stDashboard);
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

// Unsubscribe route for email compliance
user_route.get('/unsubscribe', (req, res) => {
    res.render('misc/unsubscribe', { 
        title: 'Unsubscribe - Nrutyashree Dance Academy',
        message: 'You have been successfully unsubscribed from our mailing list.'
    });
});

// Contact Us page
user_route.get('/contact', (req, res) => {
    res.render('misc/contact');
});

module.exports = user_route;