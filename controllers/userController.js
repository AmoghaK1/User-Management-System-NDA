const User = require('../models/userModel');
const session = require('express-session');
const multer = require('multer')
const path = require('path')
const bcrypt = require('bcrypt');
const fs = require('fs');
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config();
const PaymentStatus = require('../models/paymentModel');
const userVerification = require('../models/userVerification');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid'); 
const { send } = require('process');
const { error } = require('console');
const mongoose = require('mongoose')
const crypto = require('crypto');


let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.log(error);
    }
    else {
        console.log('Nodemailer Active');
    }
});

const loadRegister = async(req,res)=> {
    try {
        res.render('signup', { error: null, formData: {} }); // Always pass an empty formData object
    } catch (error) {
        console.log(error.message);
    }

}

async function initializePaymentStatus(userId) {
    const currentYear = new Date().getFullYear();
    
    // Create a new PaymentStatus document for the current year
    await PaymentStatus.findOneAndUpdate(
        { 
            userId, 
            year: currentYear 
        },
        {
            $setOnInsert: {
                months: {
                    0: 'Pending', 1: 'Pending', 2: 'Pending', 3: 'Pending',
                    4: 'Pending', 5: 'Pending', 6: 'Pending', 7: 'Pending',
                    8: 'Pending', 9: 'Pending', 10: 'Pending', 11: 'Pending'
                },
                quarters: {
                    1: 'Pending', 2: 'Pending', 3: 'Pending', 4: 'Pending'
                }
            }
        }, 
        { 
            upsert: true, 
            new: true 
        }
    );
}
const addUser = async (req, res) => {
    try {
        const { name, email, birthdate, age, student_ph_no, exam_level, mother_ph_no, father_ph_no, password, confirmPassword } = req.body;

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.render('signup', {
                error: "Passwords don't match",
                formData: req.body
            });
        }

        // Validate Email Format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.render('signup', {
                error: "Invalid email format",
                formData: req.body
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('signup', {
                error: "Email already registered",
                formData: req.body
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = new User({
            name,
            email,
            birthdate,
            age,
            student_ph_no,
            exam_level,
            mother_ph_no,
            father_ph_no,
            password: hashedPassword,
            is_admin: 0,
            is_verified: false
        });

        const userData = await user.save();
        
        // Initialize payment status (fire and forget)
        initializePaymentStatus(userData._id).catch(err => {
            console.error("Payment initialization error:", err);
        });

        // Send verification email
        try {
            await sendVerificationEmail(userData);
            // Immediately show success message
            req.flash('success', 'Registration successful! Please check your email for a verification link.');
            return res.redirect('/signup');
        } catch (emailError) {
            console.error("Verification email error:", emailError);
            // Delete the user if email sending fails
            await User.deleteOne({ _id: userData._id });
            return res.render('signup', {
                error: "Failed to send verification email. Please try again later.",
                formData: req.body
            });
        }

    } catch (error) {
        console.error("Registration error:", error);
        return res.render('signup', {
            error: "Something went wrong. Try again later.",
            formData: req.body
        });
    }
};
const sendVerificationEmail = async (user) => {
    try {
        const currentUrl = process.env.CURRENT_URL;
        
        if (!currentUrl || !currentUrl.startsWith('http')) {
            throw new Error('Invalid CURRENT_URL in environment variables');
        }

        const uniqueString = uuidv4() + user._id;
        const verificationLink = `${currentUrl}/user/verify/${user._id}/${uniqueString}`;

        // Email template handling with proper error checking
        let emailTemplate;
        try {
            const emailTemplatePath = path.resolve(__dirname, '../views/verificationEmail.html');
            emailTemplate = fs.readFileSync(emailTemplatePath, 'utf8');
        } catch (err) {
            console.error("Failed to read email template:", err);
            throw new Error('Failed to prepare verification email');
        }

        const emailHtml = emailTemplate
            .replace(/{{verificationLink}}/g, verificationLink)
            .replace(/{{rawLink}}/g, verificationLink)
            .replace(/{{userName}}/g, user.name || 'User');

        // Attachments handling
        const attachments = [];
        try {
            const imagePath = path.resolve(__dirname, '../public/images/natraj-logo.png');
            if (fs.existsSync(imagePath)) {
                attachments.push({
                    filename: 'natraj-logo.png',
                    path: imagePath,
                    cid: 'natrajLogo'
                });
            }
        } catch (err) {
            console.warn('Failed to attach logo:', err);
        }

        const mailOptions = {
            from: process.env.AUTH_EMAIL,
            to: user.email,
            subject: 'Verify Your Nrutyashree Dance Academy Account',
            html: emailHtml,
            attachments
        };

        // Hash the verification string
        const hashedUniqueString = await bcrypt.hash(uniqueString, 10);

        // Save verification record
        await new userVerification({
            userId: user._id,
            uniqueString: hashedUniqueString,
            createdAt: Date.now(),
            expiresAt: Date.now() + 21600000 // 6 hours
        }).save();
    
        // Send email
        await transporter.sendMail(mailOptions);

    } catch (error) {
        console.error("Verification email error:", error);
        // Consider cleaning up the user record if email fails
        // await User.deleteOne({ _id: user._id });
        throw error; // Re-throw to be caught by the caller
    }
};

const verifyEmail = async (req, res) => {
    let session = null;
    try {
        const { userId, uniqueString } = req.params;
        
        // Input validation
        if (!userId || !uniqueString || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.render('verifiedPage', {
                error: true,
                message: "Invalid verification link format."
            });
        }

        // Start transaction to prevent race conditions
        session = await mongoose.startSession();
        session.startTransaction();

        // Find verification record
        const verificationRecord = await userVerification.findOne({ userId }).session(session);
        
        if (!verificationRecord) {
            // Delete user record if verification record not found
            await User.deleteOne({ _id: userId }).session(session);
            await session.commitTransaction();
            return res.render('verifiedPage', {
                error: true,
                message: "Verification record not found or already used. Please register again."
            });
        }

        // Check expiration
        if (verificationRecord.expiresAt < Date.now()) {
            await User.deleteOne({ _id: userId }).session(session);
            await userVerification.deleteOne({ userId }).session(session);
            await session.commitTransaction();
            return res.render('verifiedPage', {
                error: true,
                message: "Verification link has expired. Please register again."
            });
        }

        // Compare unique strings
        const isValid = await bcrypt.compare(uniqueString, verificationRecord.uniqueString);
        
        if (!isValid) {
            // Delete user record if verification string is invalid
            await User.deleteOne({ _id: userId }).session(session);
            await userVerification.deleteOne({ userId }).session(session);
            await session.commitTransaction();
            return res.render('verifiedPage', {
                error: true,
                message: "Invalid verification link. Please register again."
            });
        }

        // Check if user exists
        const user = await User.findById(userId).session(session);
        if (!user) {
            await userVerification.deleteOne({ userId }).session(session);
            await session.commitTransaction();
            return res.render('verifiedPage', {
                error: true,
                message: "User account not found. Please register again."
            });
        }

        // Skip if already verified
        if (user.is_verified) {
            await userVerification.deleteOne({ userId }).session(session);
            await session.commitTransaction();
            return res.render('verifiedPage', {
                error: false,
                message: "Email was already verified. You can now log in."
            });
        }

        // Update and save user
        user.is_verified = true;
        user.verifiedAt = new Date();
        await user.save({ session });
        
        // Clean up verification record
        await userVerification.deleteOne({ userId }).session(session);
        await session.commitTransaction();

        // Successful verification
        return res.render('verifiedPage', {
            error: false,
            message: "Email verified successfully! You can now log in.",
            redirectUrl: '/login'
        });

    } catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        console.error("Email verification error:", error);
        
        // Delete user data on any verification error
        if (req.params.userId) {
            try {
                await User.deleteOne({ _id: req.params.userId });
                await userVerification.deleteOne({ userId: req.params.userId });
            } catch (deleteErr) {
                console.error("Failed to delete user data after verification error:", deleteErr);
            }
        }
        
        return res.render('verifiedPage', {
            error: true,
            message: "An unexpected error occurred during verification. Please register again."
        });
    } finally {
        if (session) {
            await session.endSession();
        }
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
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('forgot-password', { 
                error: 'No account with that email exists.',
                success: null
            });
        }

        // Generate token and set expiry (1 hour from now)
        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();
        const currentUrl = process.env.CURRENT_URL;
        // Send email
        const resetUrl = `${currentUrl}/reset-password/${token}`; // || `${req.protocol}://${req.get('host')}/reset-password/${token}`
        
        const mailOptions = {
            to: user.email,
            from: process.env.AUTH_EMAIL,
            subject: 'Password Reset Request',
            text: `You are receiving this because you (or someone else) have requested a password reset for your account.\n\n
            Please click on the following link to reset your password:\n\n
            ${resetUrl}\n\n
            If you didn't request this, please ignore this email.\n`
        };

        await transporter.sendMail(mailOptions);
        
        res.render('forgot-password', { 
            success: 'An email has been sent with password reset instructions.',
            error: null
        });
    } catch (error) {
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
        
        // Find user by token and check expiry
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.render('login', { 
                error: 'Password reset token is invalid or has expired.',
                success: null
            });
        }

        res.render('reset-password', { 
            token,
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

        // Find user by token and check expiry
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.render('login', { 
                error: 'Password reset token is invalid or has expired.',
                success: null
            });
        }

        // Validate passwords
        if (password !== confirmPassword) {
            return res.render('reset-password', { 
                token,
                error: 'Passwords do not match',
                success: null
            });
        }

        if (password.length < 8) {
            return res.render('reset-password', { 
                token,
                error: 'Password must be at least 8 characters',
                success: null
            });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.render('reset-password', { 
                token,
                error: 'Password must be at least 8 characters long, contain uppercase, lowercase, number, and special character',
                success: null
            });
        }

        // Hash new password and update user
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.render('login', { 
            success: 'Your password has been successfully updated.',
            error: null
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.render('reset-password', { 
            token: req.params.token,
            error: 'Error resetting password',
            success: null
        });
    }
};

const load_stDashboard = async(req,res)=>{
    try {
        if (!req.isAuthenticated()) {
            return res.redirect('/login');
        }
        
        res.render('student-dashboard', {
            user: req.user // Pass the logged-in user data to the view
        });
    } catch (error) {
        console.log(error.message);
        res.redirect('/login');
    }
}

const logout_user = async(req,res)=>{
    req.logout(function(err) {
        if (err) { return next(err); }

        req.session.regenerate((err) => {
            if (err) return next(err);

            res.clearCookie('connect.sid'); // Clear session cookie
            res.redirect('/login'); // Redirect user
        });
    });
}


const loadProfile = async(req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.redirect('/login');
        }

        // Format the date before sending to view
        const user = req.user.toObject(); // Convert mongoose doc to plain object
        if (user.birthdate) {
            user.birthdate = new Date(user.birthdate).toLocaleDateString('en-GB');
        }
        if (user.joinDate) {
            user.joinDate = new Date(user.joinDate).toLocaleDateString('en-GB');
        }

        res.render('student-profile', {
            user: user,
            error: null,
            success: null
        });
    } catch (error) {
        console.error("Profile loading error:", error);
        res.render('student-profile', {
            user: req.user,
            error: "Error loading profile",
            success: null
        });
    }
};


const updateProfile = async(req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const allowedUpdates = [
            'name', 
            'email', 
            'student_ph_no', 
            'father_ph_no', 
            'mother_ph_no'
        ];

        // Validate updates
        const updates = Object.keys(req.body);
        const isValidOperation = updates.every(update => 
            allowedUpdates.includes(update)
        );

        if (!isValidOperation) {
            return res.status(400).json({ error: 'Invalid updates!' });
        }

        // Check if email is being changed and if it's already in use
        if (req.body.email && req.body.email !== req.user.email) {
            const existingUser = await User.findOne({ 
                email: req.body.email,
                _id: { $ne: req.user._id } // Exclude current user
            });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }

        // Update user
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        updates.forEach(update => user[update] = req.body[update]);
        await user.save();

        // Format dates for response
        const userData = user.toObject();
        if (userData.birthdate) {
            userData.birthdate = new Date(userData.birthdate).toLocaleDateString('en-GB');
        }
        if (userData.joinDate) {
            userData.joinDate = new Date(userData.joinDate).toLocaleDateString('en-GB');
        }

        res.json(userData);
    } catch (error) {
        console.error("Profile update error:", error);
        res.status(400).json({ error: error.message });
    }
};


// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  
  // Cloudinary Storage Configuration
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "profile_pictures", // Folder name in Cloudinary
      allowed_formats: ["jpg", "jpeg", "png"],
      transformation: [{ width: 500, height: 500, crop: "limit" }],
    },
  });
  
  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
      const filetypes = /jpeg|jpg|png/;
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(file.originalname.toLowerCase());
  
      if (mimetype && extname) {
        return cb(null, true);
      }
      cb(new Error("Only .png, .jpg, and .jpeg formats allowed!"));
    },
  }).single("profilePicture");
  
  // Controller for updating profile picture
  const updateProfilePicture = async (req, res) => {
    upload(req, res, async function (err) {
      try {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ error: "File upload error: " + err.message });
        } else if (err) {
          return res.status(400).json({ error: err.message });
        }
  
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }
  
        const user = await User.findById(req.user._id);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
  
        // Delete old Cloudinary image if it exists (excluding default profile pic)
        if (user.profilePicture && user.profilePicture !== "../images/pfp_final_1.png") {
          const publicId = user.profilePicture.split("/").pop().split(".")[0]; // Extract public ID
          await cloudinary.uploader.destroy(`profile_pictures/${publicId}`);
        }
  
        // Update profile picture URL from Cloudinary
        user.profilePicture = req.file.path;
        await user.save();
  
        res.json({
          success: true,
          message: "Profile picture updated successfully",
          profilePicture: user.profilePicture,
        });
      } catch (error) {
        console.error("Profile picture update error:", error);
        res.status(500).json({ error: "Server error" });
      }
    });
  };

  const changePassword = async(req, res) => {
    try {
        // Check authentication
        if (!req.isAuthenticated()) {
            console.log('Unauthorized password change attempt');
            return res.status(401).json({ 
                success: false,
                error: "Not authenticated" 
            });
        }

        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ 
                success: false,
                error: "All fields are required" 
            });
        }

        // Validate password length and complexity
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                error: "Password must be at least 8 characters long, contain uppercase, lowercase, number, and special character"
            });
        }

        // Check if new password and confirm password match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ 
                success: false,
                error: "New passwords don't match" 
            });
        }

        // Get user from database
        const user = await User.findById(req.user._id);
        if (!user) {
            console.error('User not found in database:', req.user._id);
            return res.status(404).json({ 
                success: false,
                error: "User not found" 
            });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ 
                success: false,
                error: "Current password is incorrect" 
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        user.password = hashedPassword;
        await user.save();

       res.json({ 
            success: true,
            message: "Password updated successfully" 
        });

    } catch (error) {
        console.error("Password change error:", {
            userId: req?.user?._id,
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({ 
            success: false,
            error: "Server error occurred while changing password" 
        });
    }
};

const loadEventsPage = async(req,res) => {
    res.render('events')
}

const loadStudyPage = async(req,res)=>{
    res.render('study')
}

const loadCertiPage = async(req,res)=>{
    res.render('certificates')
}

const loadErrorPage = async(req,res)=>{
    res.render('404');
}
module.exports = {
    loadRegister,
    addUser,
    loadLogin,
    load_stDashboard,
    logout_user,
    loadProfile,
    updateProfile,
    updateProfilePicture,
    changePassword,
    loadEventsPage,
    loadStudyPage,
    loadCertiPage,
    verifyEmail,
    loadVerifiedPage,
    loadForgotPassword,
    forgotPassword,
    loadResetPassword,
    resetPassword,
    loadErrorPage
    
    

};