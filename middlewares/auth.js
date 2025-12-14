const passport = require('../config/passport');

const redirectIfAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) { 
       return res.redirect('/st-dashboard'); // Prevent access to login/register
    }
    next();
};

const ensureAuthenticated = (req, res, next) => {
    console.log('🔒 ensureAuthenticated middleware - isAuthenticated:', req.isAuthenticated());
    console.log('🔒 Session ID:', req.sessionID);
    console.log('🔒 Session data:', req.session);
    console.log('🔒 User in request:', req.user);
    
    if (req.isAuthenticated()) { 
        return next(); // Allow access to protected routes
    }
    console.log('⚠️  Not authenticated, redirecting to login');
    res.redirect('/login'); // Redirect unauthenticated users
};

module.exports = { 
    redirectIfAuthenticated, 
    ensureAuthenticated,
    
};
