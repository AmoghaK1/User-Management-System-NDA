const passport = require('../config/passport');

const redirectIfAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) { 
       return res.redirect('/st-dashboard'); // Prevent access to login/register
    }
    next();
};

const ensureAuthenticated = (req, res, next) => {
    const acceptHeader = req.headers.accept || '';
    const isApiPath = req.path.startsWith('/teacher/fee-month-settings') || req.path.startsWith('/fee-month-settings');
    const isFetchLike = req.headers['x-requested-with'] === 'XMLHttpRequest' || acceptHeader.includes('application/json');
    const expectsJson = isApiPath || isFetchLike;

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
    if (expectsJson) {
        return res.status(401).json({ success: false, msg: 'Please log in again to continue.' });
    }

    req.flash('error', 'Please log in to access this page');
    res.redirect('/login'); // Redirect unauthenticated users
};

module.exports = { 
    redirectIfAuthenticated, 
    ensureAuthenticated,
    
};
