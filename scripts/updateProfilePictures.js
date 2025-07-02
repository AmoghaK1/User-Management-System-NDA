const mongoose = require("mongoose");
require('dotenv').config();

// Import the User model
const User = require("../models/userModel");

// Database connection
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            writeConcern: {
                w: 1  // Acknowledge write to primary node
            }
        });
        console.log("Connected to MongoDB!");
    } catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    }
}

// Function to update profile pictures
async function updateProfilePictures() {
    try {
        console.log("Starting profile picture update process...");
        
        const oldProfilePictureUrl = "https://res.cloudinary.com/dy2kitfup/image/upload/v1700000000/profile_pictures/o9ojcgon2k7icjmkyghb";
        const newProfilePictureUrl = "https://res.cloudinary.com/dy2kitfup/image/upload/v1700000000/profile_pictures/jfjx3h5tzknc6tt2vusj";
        
        // Find all users with the old profile picture URL
        const usersToUpdate = await User.find({
            profilePicture: oldProfilePictureUrl
        });
        
        console.log(`Found ${usersToUpdate.length} users with the old profile picture URL.`);
        
        if (usersToUpdate.length === 0) {
            console.log("No users found with the specified profile picture URL.");
            return;
        }
        
        // Update all users with the old URL
        const updateResult = await User.updateMany(
            { profilePicture: oldProfilePictureUrl },
            { $set: { profilePicture: newProfilePictureUrl } }
        );
        
        console.log(`Successfully updated ${updateResult.modifiedCount} user(s).`);
        console.log(`Matched ${updateResult.matchedCount} document(s).`);
        
        // Verify the update by checking if any users still have the old URL
        const remainingOldUsers = await User.find({
            profilePicture: oldProfilePictureUrl
        });
        
        if (remainingOldUsers.length === 0) {
            console.log("✅ All users have been successfully updated!");
        } else {
            console.log(`⚠️  Warning: ${remainingOldUsers.length} users still have the old profile picture URL.`);
        }
        
        // Show a summary of current profile picture URLs
        const profilePictureStats = await User.aggregate([
            {
                $group: {
                    _id: "$profilePicture",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);
        
        console.log("\n📊 Profile Picture URL Statistics:");
        profilePictureStats.forEach((stat, index) => {
            console.log(`${index + 1}. ${stat._id || 'null'} - ${stat.count} user(s)`);
        });
        
    } catch (error) {
        console.error("Error updating profile pictures:", error);
        throw error;
    }
}

// Main execution function
async function main() {
    try {
        await connectDB();
        await updateProfilePictures();
        
        console.log("\n🎉 Profile picture update process completed successfully!");
        
    } catch (error) {
        console.error("Script execution failed:", error);
        process.exit(1);
    } finally {
        // Close the database connection
        await mongoose.connection.close();
        console.log("Database connection closed.");
        process.exit(0);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { updateProfilePictures };
