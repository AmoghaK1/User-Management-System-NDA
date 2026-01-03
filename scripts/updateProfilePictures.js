require('dotenv').config();

// Import the User model
const User = require("../models/userModel");

// Function to update profile pictures using Supabase
async function updateProfilePictures() {
    try {
        console.log("Starting profile picture update process...");
        
        const oldProfilePictureUrl = "https://res.cloudinary.com/dy2kitfup/image/upload/v1700000000/profile_pictures/o9ojcgon2k7icjmkyghb";
        const newProfilePictureUrl = "https://res.cloudinary.com/dy2kitfup/image/upload/v1700000000/profile_pictures/jfjx3h5tzknc6tt2vusj";
        
        // Find all users with the old profile picture URL
        const usersToUpdate = await User.find({
            profilepicture: oldProfilePictureUrl
        });
        
        console.log(`Found ${usersToUpdate.length} users with the old profile picture URL.`);
        
        if (usersToUpdate.length === 0) {
            console.log("No users found with the specified profile picture URL.");
            return;
        }
        
        // Update all users with the old URL
        let updatedCount = 0;
        for (const user of usersToUpdate) {
            await User.updateById(user.id, { profilepicture: newProfilePictureUrl });
            updatedCount++;
        }
        
        console.log(`Successfully updated ${updatedCount} user(s).`);
        
        // Verify the update by checking if any users still have the old URL
        const remainingOldUsers = await User.find({
            profilepicture: oldProfilePictureUrl
        });
        
        if (remainingOldUsers.length === 0) {
            console.log("✅ All users have been successfully updated!");
        } else {
            console.log(`⚠️  Warning: ${remainingOldUsers.length} users still have the old profile picture URL.`);
        }
        
        // Show a summary of current profile picture URLs
        const allUsers = await User.find({});
        const profilePictureStats = {};
        
        allUsers.forEach(user => {
            const url = user.profilepicture || 'null';
            profilePictureStats[url] = (profilePictureStats[url] || 0) + 1;
        });
        
        console.log("\n📊 Profile Picture URL Statistics:");
        Object.entries(profilePictureStats)
            .sort((a, b) => b[1] - a[1])
            .forEach(([url, count], index) => {
                console.log(`${index + 1}. ${url} - ${count} user(s)`);
            });
        
    } catch (error) {
        console.error("Error updating profile pictures:", error);
        throw error;
    }
}

// Main execution function
async function main() {
    try {
        console.log("✅ Connected to Supabase!");
        await updateProfilePictures();
        
        console.log("\n🎉 Profile picture update process completed successfully!");
        
    } catch (error) {
        console.error("Script execution failed:", error);
        process.exit(1);
    } finally {
        console.log("Script completed.");
        process.exit(0);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { updateProfilePictures };
