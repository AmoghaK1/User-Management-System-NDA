const mongoose = require("mongoose");
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
const { sequelize, testConnection } = require('./config/database');
const UserPG = require('./models/pg/userModel');
const PaymentStatusPG = require('./models/pg/paymentModel');

require("./config/passport")(passport);

const app = express();
port = process.env.PORT || 7000;

// Ensure critical environment variables are present
const missingVars = validateEnvironment();
if (missingVars.length > 0) {
  console.error('❌ Cannot start server - missing required environment variables:', missingVars);
  process.exit(1);
}

// MongoDB Connection with better error handling
mongoose.connect(process.env.MONGO_URI, {
  writeConcern: {
    w: 1  // Acknowledge write to primary node
  }
}).then(() => {
  console.log("✅ Connected to MongoDB!");
}).catch(err => {
  console.error("❌ MongoDB connection error:", err);
  console.error("Connection string (masked):", process.env.MONGO_URI ? "***provided***" : "MISSING");
  process.exit(1);
});

// PostgreSQL Connection
(async () => {
  const connected = await testConnection();
  if (connected) {
    // Sync database models (creates tables if they don't exist)
    await sequelize.sync({ alter: false }); // Set to true to auto-update schema (use carefully in production)
    console.log("✅ PostgreSQL models synchronized!");
  } else {
    console.warn("⚠️  PostgreSQL not connected - proceeding with MongoDB only");
  }
})();

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
    // secure: false,
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true,
    sameSite: 'lax'
  }
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