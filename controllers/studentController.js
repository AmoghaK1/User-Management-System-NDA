const multer = require('multer');
require("dotenv").config();

const studentService = require('../services/studentService');
const { upload } = require('../config/cloudinary');
const StudyMaterial = require('../models/studyMaterialModel');

const googleVerificationEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CALLBACK_URL
);

const buildRedirectUrl = (base = '/verification', key = 'success', value = '') => {
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}${key}=${encodeURIComponent(value)}`;
};

const formatVerificationTimestamp = (value) => {
    if (!value) return null;

    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
};


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
    if (user.createdat) {
        const createdDate = new Date(user.createdat);
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
        if (!req.isAuthenticated()) return res.redirect('/login');
        return res.render('student/student-dashboard', { user: req.user });
    } catch (error) {
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

        // Create a copy of the user object
        const userCopy = { ...req.user };
        const user = formatUserDates(userCopy);
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

        const result = await studentService.updateProfileService(req.body, req.user.id);

        if (result.error) {
            const status = /email/i.test(result.error) && /in use/i.test(result.error)
                ? 409
                : 400;
            return res.status(status).json({ error: result.error });
        }

        const message = result.needsVerification
            ? "Email updated. Please complete Google verification again to enable sensitive actions."
            : "Profile updated successfully";

        return res.status(200).json({
            success: true,
            message,
            user: result,
            ...result
        });
    } catch (error) {
        console.error("Profile update error:", error);
        return res.status(500).json({ error: error.message || 'Unable to update profile right now.' });
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

            const result = await studentService.updateProfilePictureService(req.user.id, req.file.path);

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
            return res.status(401).json({ success: false, error: "Not authenticated" });
        }

        if (!req.user?.is_verified) {
            return res.status(403).json({
                success: false,
                error: "Please complete Google verification before changing your password"
            });
        }

        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, error: "All fields are required" });
        }

        const result = await studentService.changePasswordService(
            req.user.id,
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
            userId: req?.user?.id,
            error: error.message,
            stack: error.stack
        });

        return res.status(500).json({ success: false, error: "Server error occurred while changing password" });
    }
};

const loadEventsPage = async (req, res) => {
    return res.render('student/events');
};

const loadVerificationPage = async (req, res) => {
    try {
        if (!req.isAuthenticated()) return res.redirect('/login');

        const successMessage = req.query.success || null;
        const errorMessage = req.query.error || null;
        const verifiedDisplayDate = formatVerificationTimestamp(
            req.user?.verifiedAt || req.user?.verifiedat
        );

        return res.render('student/verification', {
            user: req.user,
            success: successMessage,
            error: errorMessage,
            googleEnabled: googleVerificationEnabled,
            verifiedDateLabel: verifiedDisplayDate
        });
    } catch (error) {
        console.error('Verification page load error:', error);
        return res.redirect('/st-dashboard');
    }
};

const handleGoogleVerificationRedirect = async (req, res) => {
    const redirectTo = req.session?.oauthReturnTo || '/verification';

    if (req.session) {
        req.session.oauthReturnTo = null;
        req.session.verifyUserId = null;
    }

    if (!req.user?.is_verified) {
        return res.redirect(
            buildRedirectUrl(redirectTo, 'error', 'Google verification did not complete. Please try again.')
        );
    }

    return res.redirect(
        buildRedirectUrl(redirectTo, 'success', 'Your profile is now verified with Google!')
    );
};

const loadStudyPage = async (req, res) => {
    const levels = [
        'Senior Batch', 'Prarambhik', 'Praveshika Pratham', 'Praveshika Purna',
        'Madhyama Pratham', 'Madhyama Purna', 'Visharad Pratham',
        'Visharad Purna', 'Alankar Pratham', 'Alankar Purna' , 'TMV-BA'
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
    loadVerificationPage,
    handleGoogleVerificationRedirect,
    loadCertiPage,
    loadErrorPage,
    loadStudyPage,
    getStudyMaterials
};
