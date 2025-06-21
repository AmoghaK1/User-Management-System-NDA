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

require("./config/passport")(passport);

const app = express();
port = 7000;
mongoose.connect(process.env.MONGO_URI, {
  writeConcern: {
    w: 1  // Acknowledge write to primary node
  }
}).then(() => {
  console.log("Connected to MongoDB!");
}).catch(err => {
  console.error("MongoDB connection error:", err);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set("view engine", "ejs");

// Session configuration
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: config.session_secret,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }
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
  res.render('landing2');
});

// Start server
app.listen(port, () => {
  console.log(`Server started on Port ${port}`);
});

module.exports = app;