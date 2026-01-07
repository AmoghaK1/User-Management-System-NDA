const User = require('../models/userModel');
const { cloudinary } = require('../config/cloudinary');
const bcrypt = require('bcrypt');

const updateProfileService = async (body, stud_id) => {
    const allowedUpdates = [
        'name',
        'email',
        'student_ph_no'
    ];

    const updates = Object.keys(body);
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return { error: 'Invalid updates!' };
    }

    if (body.email) {
        const allUsers = await User.find({ email: body.email });
        const existingUser = allUsers.find(u => u.id !== stud_id);
        if (existingUser) {
            return { error: 'Email already in use' };
        }
    }

    const user = await User.findById(stud_id);
    if (!user) {
        return { error: 'User not found' };
    }

    const updateData = {};
    updates.forEach(update => {
        updateData[update] = body[update];
    });

    // If the email is changing, require re-verification and clear previous Google linkage
    const emailIsChanging = Boolean(body.email && body.email !== user.email);
    if (emailIsChanging) {
        updateData.is_verified = false;
        updateData.verifiedat = null;
        // These columns may not exist in all deployments; Supabase will ignore unknown keys
        updateData.google_sub = null;
        updateData.google_email = null;
    }

    let updatedUser;
    try {
        updatedUser = await User.updateById(stud_id, updateData);
    } catch (error) {
        const message = error?.message || '';
        const missingGoogleColumns = message.includes('google_sub') || message.includes('google_email');

        if (missingGoogleColumns) {
            delete updateData.google_sub;
            delete updateData.google_email;
            updatedUser = await User.updateById(stud_id, updateData);
        } else {
            throw error;
        }
    }

    if (updatedUser.birthdate) {
        updatedUser.birthdate = new Date(updatedUser.birthdate).toLocaleDateString('en-GB');
    }
    if (updatedUser.createdat) {
        updatedUser.createdat = new Date(updatedUser.createdat).toLocaleDateString('en-GB');
    }

    // Attach helper flag so callers can prompt re-verification in UI
    if (emailIsChanging) {
        updatedUser.needsVerification = true;
    }
    return updatedUser;
};

const updateProfilePictureService = async (userId, filePath) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            return { error: "User not found", status: 404 };
        }

        if (user.profilepicture && !user.profilepicture.includes("pfp_final_1.png")) {
            const publicId = user.profilepicture.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`profile_pictures/${publicId}`);
        }

        const updatedUser = await User.updateById(userId, { profilepicture: filePath });

        return {
            message: "Profile picture updated successfully",
            profilePicture: updatedUser.profilepicture
        };

    } catch (error) {
        console.error("Service error:", error);
        return { error: "Error updating profile picture", status: 500 };
    }
};

const changePasswordService = async (userId, currentPassword, newPassword, confirmPassword) => {
    const passwordRegex = /^(?=.*\d).{5,}$/;
    if (!passwordRegex.test(newPassword)) {
        return {
            success: false,
            status: 400,
            error: "Password must be at least 5 characters long and contain at least one number"
        };
    }

    if (newPassword !== confirmPassword) {
        return {
            success: false,
            status: 400,
            error: "New passwords don't match"
        };
    }

    const user = await User.findById(userId);
    if (!user) {
        console.error('User not found in database:', userId);
        return {
            success: false,
            status: 404,
            error: "User not found"
        };
    }

    if (!user.is_verified) {
        return {
            success: false,
            status: 403,
            error: "Google verification is required before changing your password"
        };
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        return {
            success: false,
            status: 400,
            error: "Current password is incorrect"
        };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateById(userId, { password: hashedPassword });

    return {
        success: true,
        status: 200,
        message: "Password changed successfully"
    };
};

module.exports = {
    updateProfileService,
    updateProfilePictureService,
    changePasswordService
};
