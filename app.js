const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const express = require("express");
const bodyParser = require('body-parser');
const flash = require("connect-flash");
const session = require("express-session");
const passport = require("passport");
const config = require("./config/config");
const path = require('path');
const methodOverride = require('method-override');
const validateEnvironment = require('./config/envValidation');

require("./config/passport")(passport);

const app = express();
port = process.env.PORT || 7000;

// Trust proxy for production environments (Render, Heroku, etc.)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Ensure critical environment variables are present
const missingVars = validateEnvironment();
if (missingVars.length > 0) {
  console.error('❌ Cannot start server - missing required environment variables:', missingVars);
  process.exit(1);
}

// Supabase Connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase configuration error: SUPABASE_URL or SUPABASE_KEY is missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log("✅ Connected to Supabase!");

// Make supabase available globally (optional)
global.supabase = supabase;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set("view engine", "ejs");

// Session configuration
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: process.env.SESSION_SECRET || config.session_secret,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax'
  },
  proxy: process.env.NODE_ENV === 'production'
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Method override
app.use(methodOverride('_method'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('public/uploads'));

// Flash messages
app.use(flash());

// Set up locals - IMPORTANT: This must be after flash() but before routes
app.use((req, res, next) => {
  res.locals.user = req.user; // Make user data available globally in views
  res.locals.error = req.flash("error"); // Flash error messages
  res.locals.success = req.flash("success"); // Flash success messages
  next();
});

// Routes
const userRoutes = require('./routes/userRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/', userRoutes);
app.use('/', teacherRoutes);
app.use('/', paymentRoutes);

// Landing page
app.get('/', (req, res) => {
  res.render('student/landing2');
});

// 404 Handler - Must be after all other routes
app.use((req, res, next) => {
  res.status(404).render('misc/404', { 
    error: 'Page not found',
    url: req.originalUrl 
  });
});

// Global Error Handler - Must be last
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  console.error('Error Stack:', err.stack);
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500);
  
  // Try to render error page, fallback to JSON if rendering fails
  try {
    res.render('misc/404', { 
      error: isDevelopment ? err.message : 'Something went wrong. Please try again later.',
      details: isDevelopment ? err.stack : null
    });
  } catch (renderError) {
    console.error('Error rendering error page:', renderError);
    res.json({
      error: isDevelopment ? err.message : 'Internal Server Error',
      details: isDevelopment ? err.stack : null
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server started on Port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;