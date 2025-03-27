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
        if (!userData) {
            return res.render('signup', {
                error: "Error occurred while registering",
                formData: req.body
            });
        }

        try {
            // Initialize payment status
            await initializePaymentStatus(userData._id);

            // Send verification email with the user object
            await sendVerificationEmail(userData, res);
        } catch (paymentError) {
            console.error("Payment initialization error:", paymentError);
            return res.render('signup', {
                error: "User registered, but payment initialization failed.",
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

const sendVerificationEmail = (user, res) => {
    const currentUrl = 'http://localhost:7000'; // Change to production URL
    const uniqueString = uuidv4() + user._id;

    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: user.email,
        subject: 'Verify your email',
        text: `Click on the link to verify your email: ${currentUrl}/user/verify/${user._id}/${uniqueString}`
    }

    const saltRounds = 10;
    bcrypt
    .hash(uniqueString, saltRounds)
    .then(hashedUniqueString => {
        const newVerification = new userVerification({
            userId: user._id,
            uniqueString: hashedUniqueString,
            createdAt: Date.now(),
            expiresAt: Date.now() + 21600000 // 6 hours
        });

        newVerification.save()
        .then(() => {
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log(error);
                    return res.render('signup', {
                        error: "Error occurred while sending the verification email",
                        formData: user
                    });
                }
                console.log('Email sent: ' + info.response);
                res.render('signup', {
                    success: "Registration successful. Please check your email to verify your account.",
                    formData: {}
                });
            });
        })
        .catch((error) => {
            console.log(error);
            return res.render('signup', {
                error: "Error occurred while saving the verification data",
                formData: user
            });
        });
    })
    .catch((error) => {
        return res.render('signup', {
            error: "Error occurred while hashing the email data",
            formData: user
        });
    });
};

const verifyEmail = async(req, res) => {
    let {userId, uniqueString} = req.params;
    userVerification.find({userId})
    .then((result) => {
        if(result.length > 0){
            const {expiresAt} = result[0];
            const hashedUniqueString = result[0].uniqueString;
            if(expiresAt < Date.now()){
                userVerification.deleteOne({userId})
                .then(() => {
                    User.deleteOne({_id: userId})
                    .then(() => {
                        let message = "The Verification Link has expired. Please register again";
                        res.redirect(`/user/verified/error=true&message=${encodeURIComponent(message)}`);
                    })
                    .catch((error) => {
                        console.log(error);
                        let message = "Error occurred while deleting the user data";
                        res.redirect(`/user/verified/error=true&message=${encodeURIComponent(message)}`);
                    });
                })
                .catch((error) => {
                    console.log(error);
                    let message = "Error occurred while deleting the verification data";
                    res.redirect(`/user/verified/error=true&message=${encodeURIComponent(message)}`);
                });
            } else {
                bcrypt.compare(uniqueString, hashedUniqueString)
                .then(result => {
                    if (result){
                        User.updateOne({_id: userId}, {is_verified: true})
                        .then(() => {
                            userVerification.deleteOne({userId})
                            .then(() => {
                                let message = "Email verified successfully. Please login to continue";
                                res.redirect('/login');
                            })
                            .catch((error) => {
                                console.log(error);
                                let message = "Error occurred while deleting the verification data";
                                res.redirect(`/user/verified/error=true&message=${encodeURIComponent(message)}`);
                            });
                        });
                    } else {
                        let message = "Error occurred while comparing the verification data";
                        res.redirect(`/user/verified/error=true&message=${encodeURIComponent(message)}`);
                    }
                })
                .catch((error) => {
                    console.log(error);
                    let message = "Error occurred while comparing the verification data";
                    res.redirect(`/user/verified/error=true&message=${encodeURIComponent(message)}`);
                });
            }
        } else {
            let message = "Account record doesn't exist or has been verified already. Please register properly or login";
            res.redirect(`/user/verified/error=true&message=${encodeURIComponent(message)}`);
        }
    })
    .catch((error) => {
        console.log(error);
        let message = "Error occurred while finding the verification data";
        res.redirect(`/user/verified/error=true&message=${encodeURIComponent(message)}`);
    });
};

const loadVerifiedPage = async(req,res) => {
    res.render("verifiedPage");
}

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

const loadEventsPage = async(req,res) => {
    res.render('events')
}

const loadStudyPage = async(req,res)=>{
    res.render('study')
}

const loadCertiPage = async(req,res)=>{
    res.render('certificates')
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
    loadVerifiedPage

};