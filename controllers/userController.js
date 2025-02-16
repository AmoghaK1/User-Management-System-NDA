const User = require('../models/userModel');
const session = require('express-session');
const multer = require('multer')
const path = require('path')
const bcrypt = require('bcrypt');
const fs = require('fs');
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config();

const loadRegister = async(req,res)=> {
    try {
        res.render('signup', { error: null, formData: {} }); // Always pass an empty formData object
    } catch (error) {
        console.log(error.message);
    }

}

const addUser = async (req, res) => {
    try {
        // Check if passwords match
        if (req.body.password !== req.body.confirmPassword) {
            return res.render('signup', {
                error: "Passwords don't match",
                formData: req.body
            });
        }

        // Validate Email Format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(req.body.email)) {
            return res.render('signup', {
                error: "Invalid email format",
                formData: req.body
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
            return res.render('signup', {
                error: "Email already registered",
                formData: req.body
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        // Create new user
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            birthdate: req.body.birthdate,
            age: req.body.age,
            student_ph_no: req.body.student_ph_no,
            exam_level: req.body.exam_level,
            mother_ph_no: req.body.mother_ph_no,
            father_ph_no: req.body.father_ph_no,
            password: hashedPassword,
            is_admin: 0
        });

        const userData = await user.save();
        if (userData) {
            res.render('login', { success: "Registration successful! Please login." });
        } else {
            res.render('signup', {
                error: "Error occurred while registering",
                formData: req.body
            });
        }
    } catch (error) {
        console.error("Registration error:", error);
        res.render('signup', {
            error: "Something went wrong. Try again later.",
            formData: req.body
        });
    }
};


const loadLogin = async(req,res) => {
    res.render('login', { error: null, success: null }); // Ensures both variables are always defined
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

        // Log sanitized request info for debugging
        console.log('Password change attempt for user:', req.user._id);
        console.log('Request body received:', {
            hasCurrentPassword: !!currentPassword,
            hasNewPassword: !!newPassword,
            hasConfirmPassword: !!confirmPassword
        });

        // Validate input
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ 
                success: false,
                error: "All fields are required" 
            });
        }

        // Validate password length and complexity if needed
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: "New password must be at least 8 characters long"
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

        console.log('Password successfully changed for user:', req.user._id);

        // Send consistent success response
        res.json({ 
            success: true,
            message: "Password updated successfully" 
        });

    } catch (error) {
        // Detailed error logging
        console.error("Password change error:", {
            userId: req?.user?._id,
            error: error.message,
            stack: error.stack
        });

        // Send consistent error response
        res.status(500).json({ 
            success: false,
            error: "Server error occurred while changing password" 
        });
    }
};



module.exports = {
    loadRegister,
    addUser,
    loadLogin,
    load_stDashboard,
    logout_user,
    loadProfile,
    updateProfile,
    updateProfilePicture,
    changePassword
};