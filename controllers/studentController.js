const multer = require('multer');
require("dotenv").config();

const studentService = require('../services/studentService');
const { upload } = require('../config/cloudinary');
const StudyMaterial = require('../models/studyMaterialModel');


// Helper: Format dates
const formatUserDates = (user) => {
    if (user.birthdate) {
        const birthDate = new Date(user.birthdate);
        if (!isNaN(birthDate.getTime())) {
            user.birthdate = birthDate.toLocaleDateString('en-GB');
        } else {
            user.birthdate = 'Invalid Date';
        }
    }
    if (user.createdAt) {
        const createdDate = new Date(user.createdAt);
        if (!isNaN(createdDate.getTime())) {
            user.createdAt = createdDate.toLocaleDateString('en-GB');
        } else {
            user.createdAt = 'Invalid Date';
        }
    }
    return user;
};

const load_stDashboard = async (req, res) => {
    try {
        console.log('📍 Dashboard route hit!');
        console.log('📍 User authenticated?', req.isAuthenticated());
        console.log('📍 User object:', req.user ? { id: req.user.id, email: req.user.email } : 'No user');
        
        if (!req.isAuthenticated()) {
            console.log('⚠️  Not authenticated, redirecting to login');
            return res.redirect('/login');
        }
        
        console.log('✅ Rendering student dashboard...');
        return res.render('student/student-dashboard', { user: req.user });
    } catch (error) {
        console.error('❌ Dashboard error:', error);
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

        // Handle both PostgreSQL (plain object) and MongoDB (has toObject method)
        const user = req.user.toObject ? formatUserDates(req.user.toObject()) : formatUserDates({...req.user});
        return res.render('student/student-profile', {
            user,
            error: null,
            success: null
        });
    } catch (error) {
        console.error("Profile loading error:", error);
        return res.render('student/student-profile', {
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

        // Handle both PostgreSQL (id) and MongoDB (_id)
        const userId = req.user.id || req.user._id;
        const result = await studentService.updateProfileService(req.body, userId);

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

            // Handle both PostgreSQL (id) and MongoDB (_id)
            const userId = req.user.id || req.user._id;
            const result = await studentService.updateProfilePictureService(userId, req.file.path);

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

        // Handle both PostgreSQL (id) and MongoDB (_id)
        const userId = req.user.id || req.user._id;
        const result = await studentService.changePasswordService(
            userId,
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
            userId: req?.user?.id || req?.user?._id,
            error: error.message,
            stack: error.stack
        });

        return res.status(500).json({ success: false, error: "Server error occurred while changing password" });
    }
};

const loadEventsPage = async (req, res) => {
    return res.render('student/events');
};

const loadStudyPage = async (req, res) => {
    const levels = [
        'Senior Batch', 'Prarambhik', 'Praveshika Pratham', 'Praveshika Purna',
        'Madhyama Pratham', 'Madhyama Purna', 'Visharad Pratham',
        'Visharad Purna', 'Alankar Pratham', 'Alankar Purna'
    ];

    res.render('student/study', {
        levels,
        selectedLevel: levels[0], // Default to first level
        categorized: {} // Empty initially, will be loaded via AJAX
    });
};

const getStudyMaterials = async (req, res) => {
    try {
        const { level } = req.query;
        
        if (!level) {
            return res.status(400).json({ error: 'Level parameter is required' });
        }

        const materials = await StudyMaterial.find({ level: level });

        // Group by category
        const categorized = {};
        materials.forEach(mat => {
            if (!categorized[mat.category]) {
                categorized[mat.category] = [];
            }
            categorized[mat.category].push(mat);
        });

        res.json({
            success: true,
            level: level,
            categorized: categorized,
            totalMaterials: materials.length
        });
    } catch (error) {
        console.error('Error fetching study materials:', error);
        res.status(500).json({ error: 'Failed to fetch study materials' });
    }
};

const loadCertiPage = async (req, res) => {
    return res.render('student/certificates');
};

const loadErrorPage = async (req, res) => {
    return res.render('misc/404');
};



module.exports = {
    load_stDashboard,
    logout_user,
    loadProfile,
    updateProfile,
    updateProfilePicture,
    changePassword,
    loadEventsPage,
    loadCertiPage,
    loadErrorPage,
    loadStudyPage,
    getStudyMaterials
};
