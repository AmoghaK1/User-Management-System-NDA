const passport = require('../config/passport');

const redirectIfAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) { 
       return res.redirect('/st-dashboard'); // Prevent access to login/register
    }
    next();
};

const ensureAuthenticated = (req, res, next) => {
    console.log('[ensureAuthenticated] Check:', {
        isAuthenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        sessionID: req.sessionID,
        path: req.path,
        cookies: req.headers.cookie ? 'present' : 'missing'
    });
    
    if (req.isAuthenticated()) { 
        return next(); // Allow access to protected routes
    }
    
    console.log('[ensureAuthenticated] Redirecting to login - user not authenticated');
    req.flash('error', 'Please log in to access this page');
    res.redirect('/login'); // Redirect unauthenticated users
};

module.exports = { 
    redirectIfAuthenticated, 
    ensureAuthenticated,
    
};
