const passport = require('../config/passport');

const redirectIfAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) { 
       return res.redirect('/st-dashboard'); // Prevent access to login/register
    }
    next();
};

const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) { 
        return next(); // Allow access to protected routes
    }
    res.redirect('/login'); // Redirect unauthenticated users
};

module.exports = { 
    redirectIfAuthenticated, 
    ensureAuthenticated,
    
};
