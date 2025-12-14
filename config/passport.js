const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const UserPG = require("../models/pg/userModel");
require("dotenv").config();

module.exports = (passport) => {
    passport.use(
        new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
            try {
                // Hardcoded user authentication
                if (email === "rajjii11@gmail.com" && password === process.env.TEACHER_PASSWORD) {
                    const hardcodedUser = {
                        id: "hardcoded-user", // Use a distinct string
                        email: "rajjii11@gmail.com",
                        name: "Rajshree Khare",
                    };
                    return done(null, hardcodedUser);
                }

                // Find user in PostgreSQL first
                const userPG = await UserPG.findOne({ where: { email } });
                if (userPG) {
                    // Match password
                    const isMatch = await bcrypt.compare(password, userPG.password);
                    if (!isMatch) return done(null, false, { message: "Incorrect password" });
                    
                    console.log(`✅ User authenticated from PostgreSQL: ${userPG.email}`);
                    // Convert Sequelize instance to plain object for easier handling
                    const userObj = userPG.toJSON();
                    userObj.source = 'pg'; // Mark as PostgreSQL user
                    return done(null, userObj);
                }

                // Fallback to MongoDB if not found in PostgreSQL
                const user = await User.findOne({ email });
                if (!user) return done(null, false, { message: "No user found" });

                // Match password
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) return done(null, false, { message: "Incorrect password" });

                console.log(`✅ User authenticated from MongoDB: ${user.email}`);
                return done(null, user);
            } catch (error) {
                return done(error);
            }
        })
    );

    passport.serializeUser((user, done) => {
        console.log('🔄 Serializing user:', { id: user.id, email: user.email, source: user.source });
        // Store both id and source (pg or mongo)
        if (user.source === 'pg' || (user.id && !user._id)) {
            // PostgreSQL user (UUID) or hardcoded user
            done(null, { id: user.id, source: 'pg' });
        } else {
            // MongoDB user (ObjectId)
            done(null, { id: user._id.toString(), source: 'mongo' });
        }
    });

    passport.deserializeUser(async (data, done) => {
        try {
            console.log('🔄 Deserializing user:', data);
            // Handle hardcoded user separately
            if (data.id === "hardcoded-user") {
                return done(null, {
                    id: "hardcoded-user",
                    email: "rajjii11@gmail.com",
                    name: "Rajshree Khare",
                });
            }

            // Fetch from appropriate database
            if (data.source === 'pg') {
                const userPG = await UserPG.findByPk(data.id);
                if (!userPG) {
                    console.error('❌ User not found in PostgreSQL:', data.id);
                    return done(null, false);
                }
                const userObj = userPG.toJSON();
                userObj.source = 'pg';
                console.log('✅ User deserialized from PostgreSQL:', userObj.email);
                return done(null, userObj);
            } else {
                const user = await User.findById(data.id);
                if (!user) {
                    console.error('❌ User not found in MongoDB:', data.id);
                    return done(null, false);
                }
                console.log('✅ User deserialized from MongoDB:', user.email);
                return done(null, user);
            }
        } catch (error) {
            console.error('❌ Deserialization error:', error);
            done(error);
        }
    });
};
