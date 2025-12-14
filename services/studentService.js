const User = require('../models/userModel');
const UserPG = require('../models/pg/userModel');
const { Op } = require('sequelize');
const { cloudinary } = require('../config/cloudinary');
const bcrypt = require('bcrypt');

const updateProfileService = async (body, stud_id) => {
    const allowedUpdates = [
        'name',
        'email',
        'student_ph_no',
        'father_ph_no',
        'mother_ph_no'
    ];

    const updates = Object.keys(body);
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return { error: 'Invalid updates!' };
    }

    if (body.email) {
        const existingUser = await UserPG.findOne({
            where: {
                email: body.email,
                id: { [Op.ne]: stud_id }
            }
        });
        if (existingUser) {
            console.warn(`Email already in use: ${body.email}`);
            return { error: 'Email already in use' };
        }
    }

    const user = await UserPG.findByPk(stud_id);
    if (!user) {
        return { error: 'User not found' };
    }

    updates.forEach(update => {
        user[update] = body[update];
    });

    await user.save();

    const userData = user.toJSON();
    if (userData.birthdate) {
        userData.birthdate = new Date(userData.birthdate).toLocaleDateString('en-GB');
    }
    if (userData.createdAt) {
        userData.joinDate = new Date(userData.createdAt).toLocaleDateString('en-GB');
    }

    return userData;
};

const updateProfilePictureService = async (userId, filePath) => {
    try {
        const user = await UserPG.findByPk(userId);
        if (!user) {
            return { error: "User not found", status: 404 };
        }

        if (user.profilePicture && !user.profilePicture.includes("pfp_final_1.png")) {
            const publicId = user.profilePicture.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`profile_pictures/${publicId}`);
        }

        user.profilePicture = filePath;
        await user.save();

        return {
            message: "Profile picture updated successfully",
            profilePicture: user.profilePicture
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

    const user = await UserPG.findByPk(userId);
    if (!user) {
        console.error('User not found in database:', userId);
        return {
            success: false,
            status: 404,
            error: "User not found"
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
    user.password = hashedPassword;
    await user.save();

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
