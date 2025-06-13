const multer = require('multer');
require("dotenv").config();

const studentService = require('../services/studentService');
const { upload } = require('../config/cloudinary');

// Helper: Format dates
const formatUserDates = (user) => {
    if (user.birthdate) {
        user.birthdate = new Date(user.birthdate).toLocaleDateString('en-GB');
    }
    if (user.joinDate) {
        user.joinDate = new Date(user.joinDate).toLocaleDateString('en-GB');
    }
    return user;
};

const load_stDashboard = async (req, res) => {
    try {
        if (!req.isAuthenticated()) return res.redirect('/login');
        return res.render('student-dashboard', { user: req.user });
    } catch (error) {
        console.log(error.message);
        return res.redirect('/login');
    }
};

const logout_user = async (req, res) => {
    req.logout((err) => {
        if (err) return next(err);
        req.session.regenerate((err) => {
            if (err) return next(err);
            res.clearCookie('connect.sid');
            return res.redirect('/login');
        });
    });
};

const loadProfile = async (req, res) => {
    try {
        if (!req.isAuthenticated()) return res.redirect('/login');

        const user = formatUserDates(req.user.toObject());
        return res.render('student-profile', {
            user,
            error: null,
            success: null
        });
    } catch (error) {
        console.error("Profile loading error:", error);
        return res.render('student-profile', {
            user: req.user,
            error: "Error loading profile",
            success: null
        });
    }
};

const updateProfile = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const result = await studentService.updateProfileService(req.body, req.user._id);

        if (result.error) {
            return res.status(400).json({ error: result.error });
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: result
        });
    } catch (error) {
        console.error("Profile update error:", error);
        return res.status(400).json({ error: error.message });
    }
};

const updateProfilePicture = async (req, res) => {
    upload.single('profilePicture')(req, res, async function (err) {
        try {
            if (err instanceof multer.MulterError || err) {
                return res.status(400).json({ error: "File upload error: " + err.message });
            }

            if (!req.file) {
                return res.status(400).json({ error: "No file uploaded" });
            }

            const result = await studentService.updateProfilePictureService(req.user._id, req.file.path);

            if (result.error) {
                return res.status(result.status || 400).json({ error: result.error });
            }

            return res.status(200).json({
                success: true,
                message: result.message,
                profilePicture: result.profilePicture
            });

        } catch (error) {
            console.error("Profile picture update error:", error);
            return res.status(500).json({ error: "Server error" });
        }
    });
};

const changePassword = async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            console.log('Unauthorized password change attempt');
            return res.status(401).json({ success: false, error: "Not authenticated" });
        }

        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, error: "All fields are required" });
        }

        const result = await studentService.changePasswordService(
            req.user._id,
            currentPassword,
            newPassword,
            confirmPassword
        );

        if (!result.success) {
            return res.status(result.status || 400).json({ success: false, error: result.error });
        }

        return res.status(result.status || 200).json({ success: true, message: result.message });

    } catch (error) {
        console.error("Password change error:", {
            userId: req?.user?._id,
            error: error.message,
            stack: error.stack
        });

        return res.status(500).json({ success: false, error: "Server error occurred while changing password" });
    }
};

const loadEventsPage = async (req, res) => {
    return res.render('events');
};

const loadStudyPage = async (req, res) => {
    return res.render('study');
};

const loadCertiPage = async (req, res) => {
    return res.render('certificates');
};

const loadErrorPage = async (req, res) => {
    return res.render('404');
};

module.exports = {
    load_stDashboard,
    logout_user,
    loadProfile,
    updateProfile,
    updateProfilePicture,
    changePassword,
    loadEventsPage,
    loadStudyPage,
    loadCertiPage,
    loadErrorPage
};
