const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
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

                // Find user in the database
                const user = await User.findOne({ email });
                if (!user) return done(null, false, { message: "No user found" });

                // Match password
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) return done(null, false, { message: "Incorrect password" });

                return done(null, user);
            } catch (error) {
                return done(error);
            }
        })
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            // Handle hardcoded user separately
            if (id === "hardcoded-user") {
                return done(null, {
                    id: "hardcoded-user",
                    email: "rajjii11@gmail.com",
                    name: "Rajshree Khare",
                });
            }

            // For normal users, query from the database
            const user = await User.findById(id);
            done(null, user);
        } catch (error) {
            done(error);
        }
    });
};
